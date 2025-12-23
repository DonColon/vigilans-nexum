import { GameError } from "core/GameError";
import { Input, InputTypeMap } from "./Input";
import { InputState, InputStateType } from "./InputState";
import { InputChannel, InputChannelType } from "./InputChannel";
import { GamepadConfig, GamepadDevice } from "./GamepadDevice";
import { GamepadInputType } from "./GamepadInput";
import { KeyboardDevice } from "./KeyboardDevice";
import { KeyboardInputType } from "./KeyboardInput";
import { MouseDevice } from "./MouseDevice";
import { MouseInputType } from "./MouseInput";
import { TouchpadDevice } from "./TouchpadDevice";
import { SwipeInputType } from "./SwipeInput";
import { TouchInputType } from "./TouchInput";
import { GameCommand, GameCommandConstructor } from "./GameCommand";
import { InputBuffer, InputBufferConfig } from "./InputBuffer";

export interface InputDeviceConfig {
	gamepad: GamepadConfig;
	buffer?: InputBufferConfig;
}

export class InputDevice {
	private commands: Map<string, GameCommand>;
	private channels: Map<InputChannelType, number>;
	private buffer: InputBuffer;

	private gamepad: GamepadDevice | null;
	private keyboard: KeyboardDevice;
	private mouse: MouseDevice;
	private touchpad: TouchpadDevice;

	constructor(config: InputDeviceConfig) {
		this.commands = new Map<string, GameCommand>();
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

		window.addEventListener("contextmenu", (event) => this.cancelEvent(event));
		window.addEventListener("selectstart", (event) => this.cancelEvent(event));
	}

	public update() {
		if (this.gamepad) {
			this.channels.set(InputChannel.GAMEPAD, this.gamepad.update());
		}

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
		if (this.commands.has(commandType.name)) {
			throw new GameError(`Command ${commandType.name} is already registered`);
		}

		const command = new commandType();
		this.commands.set(commandType.name, command);

		return this;
	}

	public unregisterCommand(commandType: GameCommandConstructor): this {
		this.commands.delete(commandType.name);
		return this;
	}

	public getCommand(commandType: GameCommandConstructor | string): GameCommand {
		const name = typeof commandType === "string" ? commandType : commandType.name;
		const command = this.commands.get(name);

		if (command === undefined) {
			throw new GameError(`Command ${name} is not registered`);
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
			if (this.gamepad === null) {
				return { current: false, previous: false };
			}

			return this.gamepad.getInput(inputType as GamepadInputType);
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
