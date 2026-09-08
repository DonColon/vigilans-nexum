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
	movedAlpha: 0.55,

	/** White wash over a token the instant a hit lands, during a battle animation. */
	hitFlash: Color.hex("#ffffff"),
	/** Expanding ring on a critical hit. */
	critRing: Color.hex("#ffe27a"),

	/**
	 * The floating "Miss" / damage number that pops over a struck token during a
	 * battle animation - drawn with a dark outline pass so it reads on any terrain.
	 */
	combatPop: {
		damage: Color.hex("#fff4d6"),
		miss: Color.hex("#d4dae4"),
		outline: Color.hex("#141a26"),
		/** Pixels the label drifts upward across its lifetime. */
		rise: 15
	},

	/**
	 * The HP bar slung under each token: it runs the full width of the tile,
	 * pinned to the bottom edge. `track` is the empty channel; the fill is the
	 * unit's own faction colour, drawn at full opacity even for a spent unit so
	 * wounds stay legible.
	 */
	health: {
		track: Color.hex("#2b3345")
	},
	/** Bar thickness in pixels, before the dark border pass. */
	healthBarHeight: 4,
	/** Gap between the bar and the bottom edge of the tile. */
	healthBarInset: 1,
	/** Empty margin left and right of the bar, inside the tile. */
	healthBarPadding: 2
} as const;
