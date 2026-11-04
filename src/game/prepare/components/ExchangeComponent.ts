import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

/** The unit's own pack is the left-hand panel; the other side - a partner's pack or the convoy - the right. */
export const ExchangeSide = {
	PACK: 0,
	OTHER: 1
} as const;

export type ExchangeSide = (typeof ExchangeSide)[keyof typeof ExchangeSide];

/** `heldSide` and `heldSlot` while the player is not carrying anything between the two sides. */
export const NOTHING_HELD = -1;

export interface ExchangeData extends JsonSchema {
	/** The unit whose pack is the left-hand panel. */
	unitId: string;
	/** The unit whose pack is the right-hand panel, or "" when the right-hand panel is the convoy. */
	partnerId: string;
	/** Which side the slot cursor is on - see [[ExchangeSide]]. */
	side: number;
	/** Highlighted slot on each side, kept apart so switching sides returns the cursor where it was. */
	packSlot: number;
	otherSlot: number;
	/** Side the picked-up entry came from, or [[NOTHING_HELD]] while the player carries nothing. */
	heldSide: number;
	/** Slot the picked-up entry came from; meaningless while nothing is held. */
	heldSlot: number;
	/** The player pressed confirm; [[PrepareExchangeSystem]] acts on it and clears this. */
	confirmed: boolean;
	/** The player backed out with nothing in hand; the system closes the exchange. */
	cancelled: boolean;
}

/**
 * An open exchange on the preparations screen: a unit's pack on the left and
 * either a partner's pack or the convoy on the right, with a cursor on each
 * side and whatever the player has picked up in between. Created by
 * [[PrepareExchangeState]] and removed with it; the rows themselves are read
 * fresh off the sheets and the convoy every frame, so only the choice lives
 * here - the way the trade screen keeps only its matchup.
 */
export class ExchangeComponent extends Component<ExchangeData> {
	public static readonly type = "prepare-exchange";

	/** A fresh exchange, the cursor at the top of the unit's pack, nothing in hand. */
	public static open(unitId: string, partnerId: string): ExchangeData {
		return {
			unitId,
			partnerId,
			side: ExchangeSide.PACK,
			packSlot: 0,
			otherSlot: 0,
			heldSide: NOTHING_HELD,
			heldSlot: NOTHING_HELD,
			confirmed: false,
			cancelled: false
		};
	}

	/** Whether the right-hand side is the convoy rather than another unit. */
	public static withConvoy(data: ExchangeData): boolean {
		return data.partnerId === "";
	}

	/** Whether the player is carrying an entry between the sides. */
	public static isHolding(data: ExchangeData): boolean {
		return data.heldSide !== NOTHING_HELD;
	}

	/** The slot the cursor is on, on the side it is on. */
	public static cursorSlot(data: ExchangeData): number {
		return data.side === ExchangeSide.OTHER ? data.otherSlot : data.packSlot;
	}

	/** The exchange with the cursor moved to `slot` on its side. */
	public static withCursorSlot(data: ExchangeData, slot: number): ExchangeData {
		return data.side === ExchangeSide.OTHER ? { ...data, otherSlot: slot } : { ...data, packSlot: slot };
	}

	/** The exchange with whatever was in hand put back. */
	public static dropped(data: ExchangeData): ExchangeData {
		return { ...data, heldSide: NOTHING_HELD, heldSlot: NOTHING_HELD, confirmed: false };
	}
}
