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
 * Confirm marks the highlighted row confirmed: on a readout that closes the
 * list - there is nothing to choose, so a player reaching for either button
 * should not have to find the other - and on a selectable list RosterSystem
 * reports the row instead. Either way it only marks the roster and lets the
 * system act on the next tick, like the dialog commands.
 */
export class RosterConfirmCommand extends RosterCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { roster }: RosterCommandContext): void {
		const component = roster.getComponent(RosterComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/** Closes the list. */
export class RosterCancelCommand extends RosterCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { roster }: RosterCommandContext): void {
		const component = roster.getComponent(RosterComponent);
		component.update({ ...component.read(), closed: true });
	}
}

/** The roster commands as one list, so the state allowing them and the feature registering them stay in step. */
export const rosterCommands: GameCommandConstructor[] = [RosterUpCommand, RosterDownCommand, RosterConfirmCommand, RosterCancelCommand];
