import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputSet, pressedOrHeld } from "@/core/input/commands/InputBindings";
import { cancelBinding, confirmBinding, DOWN, UP } from "@/game/input/Controls";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuCommand, MenuCommandContext } from "@/game/ui/commands/UICommand";

/** Milliseconds a direction is held before the highlight starts repeating. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

/** Moves the highlight by `step` rows, wrapping around the ends of the list. */
abstract class MoveHighlightCommand extends MenuCommand {
	constructor(
		private readonly step: number,
		input: InputSet
	) {
		super(pressedOrHeld(input), { delay: REPEAT_DELAY, rate: REPEAT_RATE });
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
		super(-1, UP);
	}
}

export class MenuDownCommand extends MoveHighlightCommand {
	constructor() {
		super(1, DOWN);
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
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { menu }: MenuCommandContext): void {
		const component = menu.getComponent(MenuComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The menu commands as one list, so the state allowing them and the feature registering them stay in step. */
export const menuCommands: GameCommandConstructor[] = [MenuUpCommand, MenuDownCommand, MenuConfirmCommand, MenuCancelCommand];
