import { Color } from "@/core/graphics/color/Color";
import { UnitFaction } from "@/game/units/model/UnitData";

interface FactionColors {
	body: Color;
	ring: Color;
	glyph: Color;
}

/**
 * The look of a unit token, in the same flat, high-contrast key as `MapTheme`:
 * a saturated disc per unit with a dark outline pass so it reads on every
 * terrain colour. The move overlay has its own palette in `MovementTheme`.
 */
export const UnitTheme = {
	faction: {
		[UnitFaction.PLAYER]: {
			body: Color.hex("#4f79c4"),
			ring: Color.hex("#dbe6ff"),
			glyph: Color.hex("#f5f9ff")
		},
		[UnitFaction.ENEMY]: {
			body: Color.hex("#c4514f"),
			ring: Color.hex("#ffe0de"),
			glyph: Color.hex("#fff4f3")
		}
	} as Record<UnitFaction, FactionColors>,

	/** Dark pass drawn under the ring, like the cursor's outline. */
	tokenOutline: Color.hex("#141a26"),
	/** Diameter of the token as a fraction of the cell. */
	tokenSize: 0.74,
	ringWidth: 2,
	glyphWidth: 2,
	/** Soft drop shadow under the token. */
	shadow: Color.hex("#0d121b55"),

	/** A unit that has already acted this turn is drawn washed out. */
	movedAlpha: 0.55
} as const;
