import { Input } from "./Input";
import { KeyboardInput, KeyboardInputType } from "./KeyboardInput";

export class KeyboardDevice {
	private keyboard: Map<KeyboardInputType, Input>;
	private lastUsed: number;

	constructor() {
		this.keyboard = new Map<KeyboardInputType, Input>();
		this.lastUsed = 0;

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

		this.cancelEvent(event);
	}

	private onKeyUp(event: KeyboardEvent) {
		const input = this.getInput(event.code as KeyboardInputType);
		input.previous = input.current;
		input.current = false;

		this.cancelEvent(event);
	}

	private cancelEvent(event: Event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
}
