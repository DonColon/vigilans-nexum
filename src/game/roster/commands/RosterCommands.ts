import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { pressedOrHeld } from "@/core/input/commands/InputBindings";
import { cancelBinding, confirmBinding, DOWN, UP } from "@/game/input/Controls";
import { RosterComponent } from "@/game/roster/components/RosterComponent";

/** Milliseconds a direction is held before the row cursor starts repeating - the menu's own feel. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

/** What a roster command is handed each tick. */
export interface RosterCommandContext {
	/** Entity carrying the open army list. */
	roster: Entity;
}

/** Input the player can trigger while the army list is up: moving down it, and closing it. */
export abstract class RosterCommand extends GameCommand<RosterCommandContext> {}

/** Steps the highlight by `step`, wrapping around the list the way a menu does. */
abstract class MoveRosterCursorCommand extends RosterCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding, { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { roster }: RosterCommandContext): void {
		const component = roster.getComponent(RosterComponent);
		const data = component.read();

		if (data.unitIds.length === 0) {
			return;
		}

		const selectedIndex = (data.selectedIndex + this.step + data.unitIds.length) % data.unitIds.length;
		component.update({ ...data, selectedIndex });
	}
}

export class RosterUpCommand extends MoveRosterCursorCommand {
	constructor() {
		super(-1, pressedOrHeld(UP));
	}
}

export class RosterDownCommand extends MoveRosterCursorCommand {
	constructor() {
		super(1, pressedOrHeld(DOWN));
	}
}

/**
 * Closes the list. Confirm and cancel both do it: there is nothing to choose
 * here yet, so a player reaching for either should not have to find the other.
 * Like the dialog commands it marks the roster and lets RosterSystem tear it
 * down on the next tick.
 */
abstract class CloseRosterCommand extends RosterCommand {
	protected action(_elapsed: number, _frame: number, { roster }: RosterCommandContext): void {
		const component = roster.getComponent(RosterComponent);
		component.update({ ...component.read(), closed: true });
	}
}

export class RosterConfirmCommand extends CloseRosterCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class RosterCancelCommand extends CloseRosterCommand {
	constructor() {
		super(cancelBinding());
	}
}

/** The roster commands as one list, so the state allowing them and the feature registering them stay in step. */
export const rosterCommands: GameCommandConstructor[] = [RosterUpCommand, RosterDownCommand, RosterConfirmCommand, RosterCancelCommand];
