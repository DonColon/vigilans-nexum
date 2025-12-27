import { Input } from "@/core/input/Input";
import { InputBuffer } from "@/core/input/InputBuffer";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState } from "@/core/input/InputState";
import { KeyboardInput, KeyboardInputType } from "@/core/input/KeyboardInput";

export class KeyboardDevice {
	private keyboard: Map<KeyboardInputType, Input>;
	private lastUsed: number;
    private buffer: InputBuffer;

	constructor(buffer: InputBuffer) {
		this.keyboard = new Map<KeyboardInputType, Input>();
		this.lastUsed = 0;

		this.buffer = buffer;

		for (const key of Object.values(KeyboardInput)) {
			this.keyboard.set(key, { current: false, previous: false });
		}

		window.addEventListener("keydown", (event) => this.onKeyDown(event));
		window.addEventListener("keyup", (event) => this.onKeyUp(event));
	}

	public update(): number {
		for (const input of this.keyboard.values()) {
			input.previous = input.current;
		}

		return this.lastUsed;
	}

	public getInput(inputType: KeyboardInputType): Input {
		const input = this.keyboard.get(inputType);

		if (!input) return { current: false, previous: false };

		return input;
	}

	private onKeyDown(event: KeyboardEvent) {
		this.lastUsed = event.timeStamp;

		const input = this.getInput(event.code as KeyboardInputType);
		input.previous = input.current;
		input.current = true;

		if (input.previous === false && input.current === true) {
			this.buffer.add(InputChannel.KEYBOARD, event.code as KeyboardInputType, InputState.JUST_PRESSED);
		}

		this.cancelEvent(event);
	}

	private onKeyUp(event: KeyboardEvent) {
		const input = this.getInput(event.code as KeyboardInputType);
		input.previous = input.current;
		input.current = false;

		if (input.previous === true && input.current === false) {
			this.buffer.add(InputChannel.KEYBOARD, event.code as KeyboardInputType, InputState.JUST_RELEASED);
		}

		this.cancelEvent(event);
	}

	private cancelEvent(event: Event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
}
