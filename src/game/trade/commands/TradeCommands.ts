import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputSet, pressed, pressedOrHeld } from "@/core/input/commands/InputBindings";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { cancelBinding, confirmBinding, DOWN, LEFT, RIGHT, UP } from "@/game/input/Controls";
import { NOTHING_HELD, TradeComponent, TradeSide } from "@/game/trade/components/TradeComponent";
import { cyclePartner } from "@/game/units/model/PartnerChoice";
import { INVENTORY_SIZE } from "@/game/units/model/UnitData";

/** Milliseconds a direction is held before the slot cursor starts repeating - the menu's own feel. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

/**
 * Partner cycling takes any direction, but stays on the d-pad rather than the
 * shared direction sets - the same choice the battle forecast makes for picking
 * a target: the left stick is too easy to nudge while lining a trade up.
 */
const NEXT_PARTNER: InputSet = { keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_D, KeyboardInput.KEY_S], buttons: [GamepadInput.DPAD_RIGHT, GamepadInput.DPAD_DOWN] };
const PREVIOUS_PARTNER: InputSet = { keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.ARROW_UP, KeyboardInput.KEY_A, KeyboardInput.KEY_W], buttons: [GamepadInput.DPAD_LEFT, GamepadInput.DPAD_UP] };

/** What a trade command is handed each tick. */
export interface TradeCommandContext {
	/** Entity carrying the open trade. */
	trade: Entity;
}

/** Input the player can trigger during a trade - partner picking and the two packs both. */
export abstract class TradeCommand extends GameCommand<TradeCommandContext> {}

/**
 * Steps the pointed-at ally by `step`, wrapping around the list - only in the
 * `partner` phase. The map cursor follows (TradeSystem parks it on the current
 * partner), so the player can see who they are about to trade with.
 */
abstract class CyclePartnerCommand extends TradeCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding);
	}

	protected action(_elapsed: number, _frame: number, { trade }: TradeCommandContext): void {
		const component = trade.getComponent(TradeComponent);
		const data = component.read();

		if (data.phase !== "partner") {
			return;
		}

		component.update({ ...data, ...cyclePartner(data, this.step) });
	}
}

export class TradeNextPartnerCommand extends CyclePartnerCommand {
	constructor() {
		super(1, pressed(NEXT_PARTNER));
	}
}

export class TradePrevPartnerCommand extends CyclePartnerCommand {
	constructor() {
		super(-1, pressed(PREVIOUS_PARTNER));
	}
}

/** Moves the slot cursor by `step` inside the pack it is in, wrapping around the ends - only once the packs are open. */
abstract class MoveSlotCommand extends TradeCommand {
	constructor(
		private readonly step: number,
		input: InputSet
	) {
		super(pressedOrHeld(input), { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { trade }: TradeCommandContext): void {
		const component = trade.getComponent(TradeComponent);
		const data = component.read();

		if (data.phase !== "trade") {
			return;
		}

		const current = data.side === TradeSide.PARTNER ? data.partnerSlot : data.unitSlot;
		const slot = (current + this.step + INVENTORY_SIZE) % INVENTORY_SIZE;

		component.update(data.side === TradeSide.PARTNER ? { ...data, partnerSlot: slot } : { ...data, unitSlot: slot });
	}
}

export class TradeUpCommand extends MoveSlotCommand {
	constructor() {
		super(-1, UP);
	}
}

export class TradeDownCommand extends MoveSlotCommand {
	constructor() {
		super(1, DOWN);
	}
}

/**
 * Puts the slot cursor in one of the two packs. Left and right pick a side
 * outright rather than toggling, so the cursor always lands where the player
 * pointed.
 */
abstract class PickSideCommand extends TradeCommand {
	constructor(
		private readonly side: TradeSide,
		input: InputSet
	) {
		super(pressed(input));
	}

	protected action(_elapsed: number, _frame: number, { trade }: TradeCommandContext): void {
		const component = trade.getComponent(TradeComponent);
		const data = component.read();

		if (data.phase !== "trade" || data.side === this.side) {
			return;
		}

		component.update({ ...data, side: this.side });
	}
}

export class TradeLeftCommand extends PickSideCommand {
	constructor() {
		super(TradeSide.UNIT, LEFT);
	}
}

export class TradeRightCommand extends PickSideCommand {
	constructor() {
		super(TradeSide.PARTNER, RIGHT);
	}
}

/**
 * Confirm: the `partner` phase locks the ally in and opens the two packs; the
 * `trade` phase picks the highlighted entry up, or puts a held one down on the
 * highlighted slot. Both need more than the trade itself, so a press is only
 * flagged here - TradeSystem resolves it and clears the flag.
 */
export class TradeConfirmCommand extends TradeCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { trade }: TradeCommandContext): void {
		const component = trade.getComponent(TradeComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/**
 * Cancel: a held entry goes back to its slot, then the open packs drop back to
 * picking a partner, and the `partner` phase backs out of the trade entirely.
 */
export class TradeCancelCommand extends TradeCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { trade }: TradeCommandContext): void {
		const component = trade.getComponent(TradeComponent);
		const data = component.read();

		if (data.heldSide !== NOTHING_HELD) {
			component.update({ ...data, heldSide: NOTHING_HELD, heldSlot: NOTHING_HELD });
			return;
		}

		if (data.phase === "trade") {
			component.update({ ...data, phase: "partner" });
			return;
		}

		component.update({ ...data, cancelled: true });
	}
}

/** The commands as one list, so the state allowing them and the feature registering them stay in step. */
export const tradeCommands: GameCommandConstructor[] = [
	TradeNextPartnerCommand,
	TradePrevPartnerCommand,
	TradeUpCommand,
	TradeDownCommand,
	TradeLeftCommand,
	TradeRightCommand,
	TradeConfirmCommand,
	TradeCancelCommand
];
