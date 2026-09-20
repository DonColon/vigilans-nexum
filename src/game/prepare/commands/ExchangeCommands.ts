import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputSet, pressed, pressedOrHeld } from "@/core/input/commands/InputBindings";
import { cancelBinding, confirmBinding, DOWN, LEFT, RIGHT, UP } from "@/game/input/Controls";
import { ExchangeComponent, ExchangeSide } from "@/game/prepare/components/ExchangeComponent";

/** Milliseconds a direction is held before the slot cursor starts repeating - the menu's own feel. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

/** What an exchange command is handed each tick. */
export interface ExchangeCommandContext {
	/** Entity carrying the open exchange. */
	exchange: Entity;
	/** How many rows the cursor's side has right now - the pack's slots, or the convoy's entries and the empty row. */
	rows: number;
}

/**
 * Input the player can trigger while a pack is open against the convoy or
 * another pack on the preparations screen: the slot cursor, which side it is
 * on, and confirm / cancel. Listed by [[PrepareExchangeState]], run by
 * [[PrepareExchangeSystem]], which also resolves the presses.
 */
export abstract class ExchangeCommand extends GameCommand<ExchangeCommandContext> {}

/** Moves the slot cursor by `step` on the side it is on, wrapping around the ends. */
abstract class MoveSlotCommand extends ExchangeCommand {
	constructor(
		private readonly step: number,
		input: InputSet
	) {
		super(pressedOrHeld(input), { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { exchange, rows }: ExchangeCommandContext): void {
		const component = exchange.getComponent(ExchangeComponent);
		const data = component.read();

		if (rows <= 0) {
			return;
		}

		const slot = (ExchangeComponent.cursorSlot(data) + this.step + rows) % rows;
		component.update(ExchangeComponent.withCursorSlot(data, slot));
	}
}

export class ExchangeUpCommand extends MoveSlotCommand {
	constructor() {
		super(-1, UP);
	}
}

export class ExchangeDownCommand extends MoveSlotCommand {
	constructor() {
		super(1, DOWN);
	}
}

/**
 * Puts the slot cursor on one of the two sides. Left and right pick a side
 * outright rather than toggling, so the cursor always lands where the player
 * pointed.
 */
abstract class PickSideCommand extends ExchangeCommand {
	constructor(
		private readonly side: ExchangeSide,
		input: InputSet
	) {
		super(pressed(input));
	}

	protected action(_elapsed: number, _frame: number, { exchange }: ExchangeCommandContext): void {
		const component = exchange.getComponent(ExchangeComponent);
		const data = component.read();

		if (data.side !== this.side) {
			component.update({ ...data, side: this.side });
		}
	}
}

export class ExchangeLeftCommand extends PickSideCommand {
	constructor() {
		super(ExchangeSide.PACK, LEFT);
	}
}

export class ExchangeRightCommand extends PickSideCommand {
	constructor() {
		super(ExchangeSide.OTHER, RIGHT);
	}
}

/**
 * Confirm picks the highlighted entry up, or puts a held one down on the
 * highlighted row. Both need the sheets and the convoy, so a press is only
 * flagged here - the exchange system resolves it and clears the flag.
 */
export class ExchangeConfirmCommand extends ExchangeCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { exchange }: ExchangeCommandContext): void {
		const component = exchange.getComponent(ExchangeComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/** Cancel puts a held entry back where it came from; with nothing in hand it closes the exchange. */
export class ExchangeCancelCommand extends ExchangeCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { exchange }: ExchangeCommandContext): void {
		const component = exchange.getComponent(ExchangeComponent);
		const data = component.read();

		component.update(ExchangeComponent.isHolding(data) ? ExchangeComponent.dropped(data) : { ...data, cancelled: true });
	}
}

/** The exchange commands as one list, so the state allowing them and the feature registering them stay in step. */
export const exchangeCommands: GameCommandConstructor[] = [ExchangeUpCommand, ExchangeDownCommand, ExchangeLeftCommand, ExchangeRightCommand, ExchangeConfirmCommand, ExchangeCancelCommand];
