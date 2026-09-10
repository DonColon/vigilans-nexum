import { Color } from "@/core/graphics/color/Color";
import { UnitFaction } from "@/game/units/model/UnitData";

/**
 * Look of the battle forecast panel. It borrows the framed Kenney panel from
 * `UITheme` (via `drawPanel`); this adds the two faction-tinted columns and the
 * doubling / weapon-cycle hints - Radiant Dawn shows each side in its own colour.
 */
export const CombatTheme = {
	/** Forecast panel width. It is tucked against the tile being attacked, so it has no fixed position. */
	width: 376,
	/**
	 * Centre of each combatant's column, as a fraction of the panel width. Pulled
	 * in from the quarter points so a long weapon name clears the frame on the
	 * outside without crowding the labels in the middle.
	 */
	columnCentre: 0.27,
	/**
	 * How far the `< >` weapon-cycle chevrons sit either side of the attacker's
	 * column centre. Fixed rather than hugging the name, so they stay put as the
	 * player cycles through weapons of different lengths - and so the longest name
	 * never pushes one into the frame.
	 */
	cycleGap: 66,
	/**
	 * How far the value columns sit from the middle. The stat labels are centred
	 * between them, so this has to clear the longest one - "Schaden" - with a
	 * gutter either side.
	 */
	valueGap: 54,
	/** Inner margin - tighter than a menu's, the forecast is meant to be glanceable. */
	padding: 18,
	/** Height of one row (name / weapon / each stat). Shorter than a menu row. */
	rowHeight: 28,
	/** Extra breathing room around the divider between the headers and the stats. */
	headerGap: 7,

	/** Translucent wash filling each half of the panel, keyed by the combatant's faction. */
	factionWash: {
		[UnitFaction.PLAYER]: Color.hex("#4f79c433"),
		[UnitFaction.ENEMY]: Color.hex("#c4514f33")
	} as Record<UnitFaction, Color>,
	/** A combatant's name, in a light tint of its faction colour. */
	factionHeading: {
		[UnitFaction.PLAYER]: Color.hex("#cfe0ff"),
		[UnitFaction.ENEMY]: Color.hex("#ffd2cd")
	} as Record<UnitFaction, Color>,

	/** The stat labels down the middle (HP / Dmg / Hit / Crit). */
	label: Color.hex("#c8a86e"),
	/** The numbers in each column. */
	value: Color.hex("#f3ecd9"),
	/** A value that would drop the target to 0 - the lethal-hit tint. */
	lethal: Color.hex("#ff9a86"),
	/** "no counterattack" dashes. */
	muted: Color.hex("#7c7768"),
	/** The "x2" follow-up marker and the < > weapon-cycle chevrons. */
	accent: Color.hex("#ffe27a")
} as const;
