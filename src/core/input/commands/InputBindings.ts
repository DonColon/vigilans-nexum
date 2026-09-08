import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState, InputStateType } from "@/core/input/InputState";
import { GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInputType } from "@/core/input/keyboard/KeyboardInput";

/** The keys and gamepad buttons one action listens to. */
export interface InputSet {
	keys?: readonly KeyboardInputType[];
	buttons?: readonly GamepadInputType[];
}

/**
 * Builders for the binding shape nearly every command wants: "any of these
 * keys or buttons". Written out by hand a command ends up with a dozen lines
 * of `new InputBinding(...)` per action, all of them the same - these keep
 * that in one place, so a command only has to name its inputs.
 */

/** Fires while every listed input is in `state` - any one of them is enough. */
export function anyOf({ keys = [], buttons = [] }: InputSet, state: InputStateType): InputBinding {
	return new InputBinding({
		and: false,
		bindings: [
			...keys.map((input) => new InputBinding({ channel: InputChannel.KEYBOARD, input, state })),
			...buttons.map((input) => new InputBinding({ channel: InputChannel.GAMEPAD, input, state }))
		]
	});
}

/** Fires on the frame one of the inputs goes down - a plain press. */
export function pressed(inputs: InputSet): InputBinding {
	return anyOf(inputs, InputState.JUST_PRESSED);
}

/**
 * Fires on the press and keeps firing while the input stays down. Pair it with
 * a [[RepeatPolicy]] on the command, which decides how fast that repeats.
 */
export function pressedOrHeld(inputs: InputSet): InputBinding {
	return new InputBinding({
		and: false,
		bindings: [anyOf(inputs, InputState.JUST_PRESSED), anyOf(inputs, InputState.STILL_PRESSED)]
	});
}
