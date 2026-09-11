import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputSet, pressed } from "@/core/input/commands/InputBindings";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";

/**
 * The buttons of the game, named once. Every command binds one of these sets
 * rather than listing keys of its own, so confirm means the same thing on the
 * map, in a menu, in a textbox and in the battle forecast - and rebinding it
 * later is a change in one place.
 */

/** "Yes, go on" - Fire Emblem's A. */
export const CONFIRM: InputSet = {
	keys: [KeyboardInput.ENTER, KeyboardInput.SPACE, KeyboardInput.KEY_Z, KeyboardInput.NUMPAD_ENTER],
	buttons: [GamepadInput.A]
};

/** "Back out of this" - Fire Emblem's B. */
export const CANCEL: InputSet = {
	keys: [KeyboardInput.ESCAPE, KeyboardInput.KEY_X, KeyboardInput.BACKSPACE],
	buttons: [GamepadInput.B]
};

/** The four directions, on the arrows, WASD, the d-pad and the left stick. */
export const UP: InputSet = { keys: [KeyboardInput.ARROW_UP, KeyboardInput.KEY_W], buttons: [GamepadInput.DPAD_UP, GamepadInput.LSTICK_UP] };
export const DOWN: InputSet = { keys: [KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_S], buttons: [GamepadInput.DPAD_DOWN, GamepadInput.LSTICK_DOWN] };
export const LEFT: InputSet = { keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.KEY_A], buttons: [GamepadInput.DPAD_LEFT, GamepadInput.LSTICK_LEFT] };
export const RIGHT: InputSet = { keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.KEY_D], buttons: [GamepadInput.DPAD_RIGHT, GamepadInput.LSTICK_RIGHT] };

/** Keys and buttons that mean "yes, go on" across the whole game. */
export function confirmBinding(): InputBinding {
	return pressed(CONFIRM);
}

/** Keys and buttons that mean "back out" across the whole game. */
export function cancelBinding(): InputBinding {
	return pressed(CANCEL);
}

/**
 * "Show me what the enemy covers" - Radiant Dawn's enemy-range toggle, on its
 * own button rather than a menu row so it can be flicked on and off while the
 * cursor is being moved.
 */
export const THREAT: InputSet = { keys: [KeyboardInput.KEY_R, KeyboardInput.KEY_E], buttons: [GamepadInput.RB] };

/** Keys and buttons that mean "show every enemy's range". */
export function threatBinding(): InputBinding {
	return pressed(THREAT);
}
