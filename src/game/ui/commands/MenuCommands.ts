import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState, InputStateType } from "@/core/input/InputState";
import { GamepadInput, GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput, KeyboardInputType } from "@/core/input/keyboard/KeyboardInput";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { confirmBinding } from "@/game/ui/commands/DialogCommands";
import { MenuCommand, MenuCommandContext } from "@/game/ui/commands/UICommand";

/** Milliseconds a direction is held before the highlight starts repeating. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

function anyOf(keys: KeyboardInputType[], buttons: GamepadInputType[], state: InputStateType): InputBinding {
	return new InputBinding({
		and: false,
		bindings: [
			...keys.map((input) => new InputBinding({ channel: InputChannel.KEYBOARD, input, state })),
			...buttons.map((input) => new InputBinding({ channel: InputChannel.GAMEPAD, input, state }))
		]
	});
}

function stepBinding(keys: KeyboardInputType[], buttons: GamepadInputType[]): InputBinding {
	return new InputBinding({
		and: false,
		bindings: [anyOf(keys, buttons, InputState.JUST_PRESSED), anyOf(keys, buttons, InputState.STILL_PRESSED)]
	});
}

/** Moves the highlight by `step` rows, wrapping around the ends of the list. */
abstract class MoveHighlightCommand extends MenuCommand {
	constructor(
		private readonly step: number,
		keys: KeyboardInputType[],
		buttons: GamepadInputType[]
	) {
		super(stepBinding(keys, buttons), { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { menu }: MenuCommandContext): void {
		const component = menu.getComponent(MenuComponent);
		const data = component.read();

		if (data.items.length === 0) {
			return;
		}

		const selectedIndex = (data.selectedIndex + this.step + data.items.length) % data.items.length;
		component.update({ ...data, selectedIndex });
	}
}

export class MenuUpCommand extends MoveHighlightCommand {
	constructor() {
		super(-1, [KeyboardInput.ARROW_UP, KeyboardInput.KEY_W], [GamepadInput.DPAD_UP, GamepadInput.LSTICK_UP]);
	}
}

export class MenuDownCommand extends MoveHighlightCommand {
	constructor() {
		super(1, [KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_S], [GamepadInput.DPAD_DOWN, GamepadInput.LSTICK_DOWN]);
	}
}

/** Locks in the highlighted row. The menu system reports it and closes the menu. */
export class MenuConfirmCommand extends MenuCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { menu }: MenuCommandContext): void {
		const component = menu.getComponent(MenuComponent);
		const data = component.read();

		component.update({ ...data, confirmedIndex: data.selectedIndex });
	}
}

/** Backs out of the menu without choosing anything. */
export class MenuCancelCommand extends MenuCommand {
	constructor() {
		super(anyOf([KeyboardInput.ESCAPE, KeyboardInput.KEY_X, KeyboardInput.BACKSPACE], [GamepadInput.B], InputState.JUST_PRESSED));
	}

	protected action(_elapsed: number, _frame: number, { menu }: MenuCommandContext): void {
		const component = menu.getComponent(MenuComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The menu commands as one list, so the state allowing them and the feature registering them stay in step. */
export const menuCommands: GameCommandConstructor[] = [MenuUpCommand, MenuDownCommand, MenuConfirmCommand, MenuCancelCommand];
