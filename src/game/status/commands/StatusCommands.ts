import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { pressedOrHeld } from "@/core/input/commands/InputBindings";
import { cancelBinding, confirmBinding, infoBinding, LEFT, RIGHT } from "@/game/input/Controls";
import { StatusComponent } from "@/game/status/components/StatusComponent";

/** Milliseconds a direction is held before paging starts repeating - the army list's own feel. */
const REPEAT_DELAY = 300;

/** Milliseconds between two pages while a direction stays held. */
const REPEAT_RATE = 120;

/** What a status command is handed each tick. */
export interface StatusCommandContext {
	/** Entity carrying the open unit sheet. */
	status: Entity;
}

/** Input the player can trigger while a unit sheet is up: paging to the next unit, and closing it. */
export abstract class StatusCommand extends GameCommand<StatusCommandContext> {}

/** Turns the page by `step` units, wrapping around the list the way the army list's cursor does. */
abstract class PageStatusCommand extends StatusCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding, { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { status }: StatusCommandContext): void {
		const component = status.getComponent(StatusComponent);
		const data = component.read();

		if (data.unitIds.length === 0) {
			return;
		}

		const index = (data.index + this.step + data.unitIds.length) % data.unitIds.length;
		component.update({ ...data, index });
	}
}

export class StatusPreviousCommand extends PageStatusCommand {
	constructor() {
		super(-1, pressedOrHeld(LEFT));
	}
}

export class StatusNextCommand extends PageStatusCommand {
	constructor() {
		super(1, pressedOrHeld(RIGHT));
	}
}

/**
 * Closes the sheet. Confirm, cancel and the info button all do it: there is
 * nothing on a readout to choose, and the button that opened it should put it
 * away again. Like the army list it marks the sheet and lets StatusSystem tear
 * it down on the next tick.
 */
abstract class CloseStatusCommand extends StatusCommand {
	protected action(_elapsed: number, _frame: number, { status }: StatusCommandContext): void {
		const component = status.getComponent(StatusComponent);
		component.update({ ...component.read(), closed: true });
	}
}

export class StatusConfirmCommand extends CloseStatusCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class StatusCancelCommand extends CloseStatusCommand {
	constructor() {
		super(cancelBinding());
	}
}

export class StatusInfoCommand extends CloseStatusCommand {
	constructor() {
		super(infoBinding());
	}
}

/** The status commands as one list, so the state allowing them and the feature registering them stay in step. */
export const statusCommands: GameCommandConstructor[] = [StatusPreviousCommand, StatusNextCommand, StatusConfirmCommand, StatusCancelCommand, StatusInfoCommand];
