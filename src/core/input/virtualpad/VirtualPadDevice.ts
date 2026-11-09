import { GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { Input } from "@/core/input/Input";
import { InputBuffer } from "@/core/input/InputBuffer";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState } from "@/core/input/InputState";

/**
 * Gamepad buttons pressed on the screen instead of on a controller - the touch
 * pad drawn over the game on a phone. It reports through the gamepad channel,
 * merged with a real controller by the InputDevice, so every command bound to
 * a gamepad button works on a touch screen with no change of its own.
 *
 * Presses arrive as events between frames and `update` turns them into the
 * frame-by-frame state the commands read. A tap shorter than a frame - down
 * and up before the next update - still counts as one press: it is held for
 * exactly that next frame.
 */
export class VirtualPadDevice {
	private readonly inputs = new Map<GamepadInputType, Input>();
	private readonly held = new Set<GamepadInputType>();
	private readonly tapped = new Set<GamepadInputType>();
	private lastUsed = 0;

	constructor(private readonly buffer: InputBuffer) {}

	/** A finger went down on `button`. */
	public press(button: GamepadInputType, timeStamp: number = performance.now()): void {
		this.held.add(button);
		this.tapped.add(button);
		this.lastUsed = timeStamp;
	}

	/** The finger on `button` lifted, or slid off it. */
	public release(button: GamepadInputType, timeStamp: number = performance.now()): void {
		this.held.delete(button);
		this.lastUsed = timeStamp;
	}

	/**
	 * Lifts every finger but keeps the taps the game has not seen yet: a quick
	 * tap that ended before the next frame still counts. For when no finger is
	 * on the screen any more.
	 */
	public releaseHeld(timeStamp: number = performance.now()): void {
		if (this.held.size > 0) {
			this.held.clear();
			this.lastUsed = timeStamp;
		}
	}

	/** Lets go of everything, unseen taps included - the pad was hidden, or the page lost focus. */
	public releaseAll(): void {
		this.held.clear();
		this.tapped.clear();
	}

	public isHeld(button: GamepadInputType): boolean {
		return this.held.has(button);
	}

	/** Advances one frame; returns when the pad was last touched, like every device. */
	public update(): number {
		for (const button of new Set([...this.inputs.keys(), ...this.tapped])) {
			const input = this.getInput(button);

			input.previous = input.current;
			input.current = this.held.has(button) || this.tapped.has(button);

			if (!input.previous && input.current) {
				this.buffer.add(InputChannel.GAMEPAD, button, InputState.JUST_PRESSED);
			} else if (input.previous && !input.current) {
				this.buffer.add(InputChannel.GAMEPAD, button, InputState.JUST_RELEASED);
			}
		}

		this.tapped.clear();

		return this.lastUsed;
	}

	public getInput(button: GamepadInputType): Input {
		let input = this.inputs.get(button);

		if (input === undefined) {
			input = { current: false, previous: false };
			this.inputs.set(button, input);
		}

		return input;
	}
}
