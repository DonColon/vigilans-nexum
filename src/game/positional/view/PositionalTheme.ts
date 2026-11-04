import { Color } from "@/core/graphics/color/Color";

/**
 * The look of the "where will they land?" overlay, in the same flat key as
 * `MovementTheme`: a green wash over every tile a piece slides onto under the
 * option the cursor is on. Green because it is neither the blue of "I can walk
 * here" nor the red of "I can strike here" - it is a tile somebody else is
 * about to be put on.
 */
export const PositionalTheme = {
	/** Wash over a tile a unit is about to be moved onto. */
	landingFill: Color.hex("#3aa56e50"),
	landingEdge: Color.hex("#a0e6c0a0")
} as const;
