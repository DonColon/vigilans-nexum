import { Color } from "@/core/graphics/color/Color";

/**
 * The look of the enemy-range overlay, in the same flat key as `MovementTheme`.
 * It has to read as "theirs" beside the player's own blue-and-red overlay, so
 * where a picked-up unit gets blue for its steps and red for its reach, an
 * enemy gets crimson for its steps and amber for its reach - and the two can be
 * on screen together without either being mistaken for the other.
 */
export const ThreatTheme = {
	/** Crimson wash over a tile an enemy can move onto. */
	moveFill: Color.hex("#a8324640"),
	moveEdge: Color.hex("#e6909c80"),
	/** Amber wash over a tile it could strike from somewhere it can reach. */
	attackFill: Color.hex("#d4762a40"),
	attackEdge: Color.hex("#f0c08880")
} as const;
