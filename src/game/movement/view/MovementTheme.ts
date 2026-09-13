import { Color } from "@/core/graphics/color/Color";

/**
 * The look of the move overlay, in the same flat key as `MapTheme`: a blue wash
 * for tiles the unit can step on, red for tiles it could attack, and the pale
 * path the cursor traces over a dark backing so it reads on bright terrain.
 */
export const MovementTheme = {
	/** Blue wash over a tile the selected unit can move onto. */
	moveFill: Color.hex("#3a6ea540"),
	moveEdge: Color.hex("#9cc2e680"),
	/** Red wash over a tile it could attack. */
	attackFill: Color.hex("#a83a3a40"),
	attackEdge: Color.hex("#e6a0a080"),

	/** Filled behind every tile the path runs through. */
	pathBacking: Color.hex("#141a26aa"),
	/** The path band and arrow head - the off-white of the kenney 1-bit art. */
	path: Color.hex("#d8cfc0"),
	/** Band thickness as a fraction of the cell; rounded to an even pixel count. */
	pathBand: 0.42
} as const;
