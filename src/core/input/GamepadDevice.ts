import { GamepadInput, GamepadInputType } from "./GamepadInput";
import { Input } from "./Input";
import { InputBuffer } from "./InputBuffer";
import { InputChannel } from "./InputChannel";
import { InputState } from "./InputState";

export interface GamepadConfig {
	axisThreshold: number;
	deadZone: number;
}

export class GamepadDevice {
	private gamepad: Map<GamepadInputType, Input>;
	private axisThreshold: number = 0.5;
	private deadZone: number = 0.15;
	private slot: number;
    private buffer: InputBuffer;

	constructor(config: GamepadConfig, buffer: InputBuffer) {
		this.gamepad = new Map<GamepadInputType, Input>();
		this.axisThreshold = config.axisThreshold;
		this.deadZone = config.deadZone;
		this.slot = 0;

		this.buffer = buffer;

		for (const value of Object.values(GamepadInput)) {
			this.gamepad.set(value, { current: false, previous: false });
		}

		window.addEventListener("gamepadconnected", (event) => this.onGamepadConnected(event));
	}

	public update(): number {
		const gamepads = navigator.getGamepads();
		const gamepad = gamepads.at(this.slot);

		if (!gamepad) return 0;

		for (const [index, button] of gamepad.buttons.entries()) {
			const input = this.getInput(index as GamepadInputType);
			input.previous = input.current;
			input.current = button.pressed;

			if (input.previous === false && input.current === true) {
				this.buffer.add(InputChannel.GAMEPAD, index as GamepadInputType, InputState.JUST_PRESSED);
			} else if (input.previous === true && input.current === false) {
				this.buffer.add(InputChannel.GAMEPAD, index as GamepadInputType, InputState.JUST_RELEASED);
			}
		}

		const axisButtons = [
			this.checkAxis(gamepad.axes[0], 'negative'),
			this.checkAxis(gamepad.axes[0], 'positive'),
			this.checkAxis(gamepad.axes[1], 'negative'),
			this.checkAxis(gamepad.axes[1], 'positive'),
			this.checkAxis(gamepad.axes[2], 'negative'),
			this.checkAxis(gamepad.axes[2], 'positive'),
			this.checkAxis(gamepad.axes[3], 'negative'),
			this.checkAxis(gamepad.axes[3], 'positive')
		];

		for (let i = 0; i < axisButtons.length; i++) {
			const index = i + gamepad.buttons.length;

			const input = this.getInput(index as GamepadInputType);
			input.previous = input.current;
			input.current = axisButtons[i];

			if (input.previous === false && input.current === true) {
				this.buffer.add(InputChannel.GAMEPAD, index as GamepadInputType, InputState.JUST_PRESSED);
			} else if (input.previous === true && input.current === false) {
				this.buffer.add(InputChannel.GAMEPAD, index as GamepadInputType, InputState.JUST_RELEASED);
			}
		}

		return gamepad.timestamp;
	}

	private checkAxis(value: number, direction: 'positive' | 'negative'): boolean {
		if (Math.abs(value) < this.deadZone) return false;
		return direction === 'positive' 
			? value >= this.axisThreshold 
			: value <= -this.axisThreshold;
	}

	public getInput(inputType: GamepadInputType): Input {
		const input = this.gamepad.get(inputType);

		if (!input) return { current: false, previous: false };

		return input;
	}

	private onGamepadConnected(event: GamepadEvent) {
		this.slot = event.gamepad.index;
		this.cancelEvent(event);
	}

	private cancelEvent(event: Event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
}
