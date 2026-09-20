import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputSet, pressedOrHeld } from "@/core/input/commands/InputBindings";
import { cancelBinding, confirmBinding, DOWN, LEFT, RIGHT, UP } from "@/game/input/Controls";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuCommand, MenuCommandContext } from "@/game/ui/commands/UICommand";

/** Milliseconds a direction is held before the highlight starts repeating. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

/** The four ways the highlight can be stepped. */
export type MenuDirection = "up" | "down" | "left" | "right";

/**
 * The row the highlight lands on from `index` when stepped `direction`
 * through `count` rows laid out in `columns`. Up and down move a column's
 * worth and wrap around the ends of that column; left and right move one row
 * along the reading order and wrap around the list. A one-column menu keeps
 * its feel: up and down wrap around the list, left and right do nothing.
 */
export function steppedHighlight(index: number, count: number, columns: number, direction: MenuDirection): number {
	if (count === 0) {
		return 0;
	}

	const perRow = Math.max(1, columns);

	switch (direction) {
		case "left":
			return perRow === 1 ? index : (index - 1 + count) % count;
		case "right":
			return perRow === 1 ? index : (index + 1) % count;
		case "down": {
			const next = index + perRow;
			return next < count ? next : index % perRow;
		}
		case "up": {
			const next = index - perRow;

			if (next >= 0) {
				return next;
			}

			// The bottom of this column.
			const top = index % perRow;
			return top + Math.floor((count - 1 - top) / perRow) * perRow;
		}
		default:
			return index;
	}
}

/** Moves the highlight one step in a direction - see [[steppedHighlight]]. */
abstract class MoveHighlightCommand extends MenuCommand {
	constructor(
		private readonly direction: MenuDirection,
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

		const selectedIndex = steppedHighlight(data.selectedIndex, data.items.length, data.columns, this.direction);

		if (selectedIndex !== data.selectedIndex) {
			component.update({ ...data, selectedIndex });
		}
	}
}

export class MenuUpCommand extends MoveHighlightCommand {
	constructor() {
		super("up", UP);
	}
}

export class MenuDownCommand extends MoveHighlightCommand {
	constructor() {
		super("down", DOWN);
	}
}

export class MenuLeftCommand extends MoveHighlightCommand {
	constructor() {
		super("left", LEFT);
	}
}

export class MenuRightCommand extends MoveHighlightCommand {
	constructor() {
		super("right", RIGHT);
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
export const menuCommands: GameCommandConstructor[] = [MenuUpCommand, MenuDownCommand, MenuLeftCommand, MenuRightCommand, MenuConfirmCommand, MenuCancelCommand];
