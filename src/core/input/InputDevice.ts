import { GameError } from "@/core/GameError";
import { Input, InputTypeMap } from "@/core/input/Input";
import { InputState, InputStateType } from "@/core/input/InputState";
import { InputChannel, InputChannelType } from "@/core/input/InputChannel";
import { GamepadConfig, GamepadDevice } from "@/core/input/gamepad/GamepadDevice";
import { GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { KeyboardDevice } from "@/core/input/keyboard/KeyboardDevice";
import { KeyboardInputType } from "@/core/input/keyboard/KeyboardInput";
import { MouseDevice } from "@/core/input/mouse/MouseDevice";
import { MouseInputType } from "@/core/input/mouse/MouseInput";
import { TouchpadDevice } from "@/core/input/touchpad/TouchpadDevice";
import { SwipeInputType } from "@/core/input/touchpad/SwipeInput";
import { TouchInputType } from "@/core/input/touchpad/TouchInput";
import { VirtualPadDevice } from "@/core/input/virtualpad/VirtualPadDevice";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBuffer, InputBufferConfig } from "@/core/input/InputBuffer";
import { GameCoreService } from "@/core/service/GameCoreService";

export interface InputDeviceConfig {
	gamepad: GamepadConfig;
	buffer?: InputBufferConfig;
}

@GameCoreService("InputDevice")
export class InputDevice {
	// Keyed by the class itself, never its `name`: a minifier renames classes.
	private commands: Map<GameCommandConstructor, GameCommand>;
	private channels: Map<InputChannelType, number>;
	private buffer: InputBuffer;

	private gamepad: GamepadDevice | null;
	private keyboard: KeyboardDevice;
	private mouse: MouseDevice;
	private touchpad: TouchpadDevice;
	private virtualPad: VirtualPadDevice;

	constructor(config: InputDeviceConfig) {
		this.commands = new Map<GameCommandConstructor, GameCommand>();
		this.channels = new Map<InputChannelType, number>();
		this.buffer = new InputBuffer(config.buffer);

		if (this.isGamepadSupported()) {
			this.gamepad = new GamepadDevice(config.gamepad, this.buffer);
		} else {
			this.gamepad = null;
		}

		this.keyboard = new KeyboardDevice(this.buffer);
		this.mouse = new MouseDevice(this.buffer);
		this.touchpad = new TouchpadDevice(this.buffer);
		this.virtualPad = new VirtualPadDevice(this.buffer);

		window.addEventListener("contextmenu", (event) => this.cancelEvent(event));
		window.addEventListener("selectstart", (event) => this.cancelEvent(event));
	}

	public update() {
		// A controller and the on-screen pad share the gamepad channel.
		const padUsed = this.virtualPad.update();
		const controllerUsed = this.gamepad ? this.gamepad.update() : 0;
		this.channels.set(InputChannel.GAMEPAD, Math.max(controllerUsed, padUsed));

		this.channels.set(InputChannel.KEYBOARD, this.keyboard.update());
		this.channels.set(InputChannel.MOUSE, this.mouse.update());
		this.channels.set(InputChannel.TOUCHPAD, this.touchpad.update());

		this.buffer.update();
	}

	public uses(channel: InputChannelType): boolean {
		const channelTime = this.channels.get(channel) ?? 0;
		const maxTime = Math.max(...this.channels.values());
		const threshold = 100;

		return maxTime - channelTime < threshold;
	}

	public isInputUsed<K extends keyof InputTypeMap>(channel: K, inputType: InputTypeMap[K], state: InputStateType): boolean {
		const currentState = this.getState(channel, inputType);

		if (currentState === state) {
			return true;
		}

		return this.buffer.has(channel, inputType, state);
	}

	public registerCommand(commandType: GameCommandConstructor): this {
		if (this.commands.has(commandType)) {
			throw new GameError(`Command ${commandType.name} is already registered`);
		}

		const command = new commandType();
		this.commands.set(commandType, command);

		return this;
	}

	public unregisterCommand(commandType: GameCommandConstructor): this {
		this.commands.delete(commandType);
		return this;
	}

	/**
	 * Drops every buffered press. Called when a state becomes active so an input
	 * aimed at the previous state - most visibly the confirm press that opened a
	 * menu - is not replayed into the new one.
	 */
	public clearInputBuffer(): void {
		this.buffer.clear();
	}

	/** The on-screen pad's buttons, pressed by the touch controls drawn over the game. */
	public getVirtualPad(): VirtualPadDevice {
		return this.virtualPad;
	}

	public getCommand(commandType: GameCommandConstructor): GameCommand {
		const command = this.commands.get(commandType);

		if (command === undefined) {
			throw new GameError(`Command ${commandType.name} is not registered`);
		}

		return command;
	}

	private getState<K extends keyof InputTypeMap>(channel: K, inputType: InputTypeMap[K]): InputStateType {
		const input = this.getInput(channel, inputType);

		if (input.previous === false && input.current === false) {
			return InputState.STILL_RELEASED;
		} else if (input.previous === false && input.current === true) {
			return InputState.JUST_PRESSED;
		} else if (input.previous === true && input.current === true) {
			return InputState.STILL_PRESSED;
		} else if (input.previous === true && input.current === false) {
			return InputState.JUST_RELEASED;
		}

		return InputState.STILL_RELEASED;
	}

	private getInput<K extends keyof InputTypeMap>(channel: K, inputType: InputTypeMap[K]): Input {
		if (channel === InputChannel.GAMEPAD) {
			const onScreen = this.virtualPad.getInput(inputType as GamepadInputType);

			if (this.gamepad === null) {
				return onScreen;
			}

			// Down if it is down on either: a controller and the on-screen pad are one gamepad.
			const controller = this.gamepad.getInput(inputType as GamepadInputType);

			return { current: controller.current || onScreen.current, previous: controller.previous || onScreen.previous };
		} else if (channel === InputChannel.KEYBOARD) {
			return this.keyboard.getInput(inputType as KeyboardInputType);
		} else if (channel === InputChannel.MOUSE) {
			return this.mouse.getInput(inputType as MouseInputType);
		} else if (channel === InputChannel.TOUCHPAD) {
			return this.touchpad.getInput(inputType as TouchInputType | SwipeInputType);
		}

		return { current: false, previous: false };
	}

	private isGamepadSupported() {
		return "getGamepads" in navigator;
	}

	private cancelEvent(event: Event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
}
