import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

/**
 * The two steps of a trade: `partner` moves the map cursor between the allies
 * standing next to the unit (no panels yet), `trade` shows the two packs side by
 * side. Confirm steps `partner -> trade`; cancel steps back.
 */
export type TradePhase = "partner" | "trade";

/** The unit's own pack is the left-hand side of the screen, its partner's the right. */
export const TradeSide = {
	UNIT: 0,
	PARTNER: 1
} as const;

export type TradeSide = (typeof TradeSide)[keyof typeof TradeSide];

/** `heldSide` when the player is not carrying anything between the packs. */
export const NOTHING_HELD = -1;

export interface TradeData extends JsonSchema {
	/** Which step the player is on - see [[TradePhase]]. */
	phase: TradePhase;
	/** The unit that opened the trade - the left-hand pack. */
	unitId: string;
	/** Unit ids of every ally standing next to it - the partners the cursor cycles. */
	partnerIds: string[];
	/** Index into `partnerIds` of the ally being pointed at. */
	partnerIndex: number;
	/** Resolved current partner - `partnerIds[partnerIndex]`, kept in step by TradeSystem. */
	partnerId: string;
	/** Which pack the slot cursor is in - see [[TradeSide]]. */
	side: number;
	/** Highlighted slot in each pack, kept apart so switching sides returns the cursor where it was. */
	unitSlot: number;
	partnerSlot: number;
	/** Side the picked-up entry came from, or [[NOTHING_HELD]] while the player carries nothing. */
	heldSide: number;
	/** Slot the picked-up entry came from; meaningless while nothing is held. */
	heldSlot: number;
	/** Tile the map cursor returns to when the trade is backed out of - the unit's own tile. */
	restoreColumn: number;
	restoreRow: number;
	/** The player pressed confirm; TradeSystem acts on it for the current phase and clears this. */
	confirmed: boolean;
	/** The player backed out of the partner step; TradeSystem reports it and pops the state. */
	cancelled: boolean;
}

/**
 * The open trade: who is trading, which allies are beside them, and - once a
 * partner is picked - where the slot cursor is and what has been picked up. The
 * rows themselves are read fresh off the two units every frame by
 * `TradeRenderSystem`, so only the choice lives here, the same way the battle
 * forecast keeps only its matchup.
 */
export class TradeComponent extends Component<TradeData> {
	public static readonly type = "trade";
}
