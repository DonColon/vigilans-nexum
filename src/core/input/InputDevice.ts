import { GameError } from "core/GameError";
import { Input, InputTypeMap } from "./Input";
import { InputState, InputStateType } from "./InputState";
import { InputChannel, InputChannelType } from "./InputChannel";
import { GamepadDevice } from "./GamepadDevice";
import { GamepadInputType } from "./GamepadInput";
import { KeyboardDevice } from "./KeyboardDevice";
import { KeyboardInputType } from "./KeyboardInput";
import { MouseDevice } from "./MouseDevice";
import { MouseInputType } from "./MouseInput";
import { TouchpadDevice } from "./TouchpadDevice";
import { SwipeInputType } from "./SwipeInput";
import { TouchInputType } from "./TouchInput";
import { GameCommand, GameCommandConstructor } from "./GameCommand";

export class InputDevice {
	private commands: Map<string, GameCommand>;
	private channels: Map<InputChannelType, number>;

	private gamepad: GamepadDevice;
	private keyboard: KeyboardDevice;
	private mouse: MouseDevice;
	private touchpad: TouchpadDevice;

	constructor() {
		this.commands = new Map<string, GameCommand>();
		this.channels = new Map<InputChannelType, number>();

		if (!this.isGamepadSupported()) {
			throw new GameError("Gamepad not supported by browser");
		}

		this.gamepad = new GamepadDevice();
		this.keyboard = new KeyboardDevice();
		this.mouse = new MouseDevice();
		this.touchpad = new TouchpadDevice();

		window.addEventListener("contextmenu", (event) => this.cancelEvent(event));
		window.addEventListener("selectstart", (event) => this.cancelEvent(event));
	}

	public update() {
		this.channels.set(InputChannel.GAMEPAD, this.gamepad.update());
		this.channels.set(InputChannel.KEYBOARD, this.keyboard.update());
		this.channels.set(InputChannel.MOUSE, this.mouse.update());
		this.channels.set(InputChannel.TOUCHPAD, this.touchpad.update());
	}

	public uses(channel: InputChannelType): boolean {
		const max = Math.max(...this.channels.values());
		const inputChannel = [...this.channels].find(([, value]) => value === max);

		if (!inputChannel) return false;

		return inputChannel.at(0) === channel;
	}

	public isState<K extends keyof InputTypeMap>(channel: K, inputType: InputTypeMap[K], state: InputStateType): boolean {
		return this.getState(channel, inputType) === state;
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
