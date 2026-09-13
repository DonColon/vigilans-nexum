import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { LEVEL_UP_EXPERIENCE, UnitData } from "@/game/units/model/UnitData";

/**
 * The card that pops up over a unit while the cursor rests on it - Fire
 * Emblem's hover window, drawn as a bubble above the token with an arrow down
 * to it: who it is, what it is and how far along its level, how hurt and
 * how much magic it has left, how close its next level is, and what it is
 * holding - at a glance and without opening anything. Drawn on the same dark
 * plate, in the same small pixel font, as the terrain readout in the corner,
 * so the two read as one HUD.
 *
 * Where it goes is worked out here, so the edge cases - a unit at the top of
 * the map, one at a side edge - can be checked without a canvas.
 */

// The `kenney-mini` pixel font the corner readouts use; the fallback covers the
// frame or two before the font asset lands.
const LABEL_FAMILY = "'kenney-mini', 'Trebuchet MS', sans-serif";

export const UnitCard = {
	/** Gap between the tip of the arrow and the tile it points at. */
	gap: 2,
	/** Corner radius of the plate. */
	radius: 4,
	/** The arrow from the plate to the tile: how wide its base is, how far it reaches. */
	arrow: { width: 18, height: 10 },
	/** Gap the card keeps from the edges of the screen when it has to be pushed in. */
	inset: 6,
	/** Inner padding of the plate around its rows. */
	padding: 6,
	/** Baseline-to-baseline distance of the rows. */
	lineHeight: 20,
	/** Width of the plate - fixed, so it never jitters as the cursor moves between units. */
	width: 248,
	/** Room a bar row keeps on its left for its label - "HP", "MP", "EXP". */
	barLabelWidth: 36,
	/** Room a bar row keeps on its right for its numbers - "20/20" at the widest. */
	barValueWidth: 52,
	/** Breathing room between the end of a bar and the numbers beside it. */
	barValueGap: 10,
	/** Extra height between the bars and the weapon line, for the rule drawn across it. */
	dividerGap: 8,
	/** Radius of the token drawn on the card's left. */
	tokenRadius: 14,
	/** Gap between the token and the text beside it. */
	tokenGap: 8,
	/** Thickness of the bars. */
	barHeight: 6,

	font: { size: "16px", family: LABEL_FAMILY, weight: "normal" } as FontStyleSettings,
	/** Cap height over em for the font above - used to sit a row on its optical centre. */
	capRatio: 0.625,

	/** The same plate as the terrain readout - see TileInfoHud. */
	plate: Color.hex("#141a26f0"),
	/** The unit's name, in the gold the UI uses for a heading. */
	name: Color.hex("#ffe07a"),
	/** The class line under the name. */
	label: Color.hex("#9aa1ad"),
	/** The HP numbers and the weapon. */
	value: Color.hex("#f3ecd9"),
	/** A unit with nothing readied. */
	muted: Color.hex("#6f7683"),
	/** The empty channel of a bar. */
	track: Color.hex("#2b3345"),
	/** A dark border around a bar, so it reads on the plate. */
	barOutline: Color.hex("#0d121b"),
	/** The rule between the bars and the weapon line - the same faint gold the unit sheet rules its columns with. */
	divider: Color.hex("#c8a86e66"),
	/** The MP bar's fill - a violet, so it never reads as a second HP bar. */
	mp: Color.hex("#b389f5"),
	/** The experience bar's fill - the same blue the bar after a fight fills in. */
	experience: Color.hex("#7fb2ff")
} as const;

/** Name, class and level, the HP / MP / EXP bars, the weapon: the card is always this tall. */
export const UNIT_CARD_ROWS = 6;

/** Height of the plate - fixed, whatever the unit, for the same reason the width is. The rule before the weapon line takes its own gap. */
export const UNIT_CARD_HEIGHT = UnitCard.padding * 2 + UNIT_CARD_ROWS * UnitCard.lineHeight + UnitCard.dividerGap;

/** One bar of the card: what it measures, the numbers beside it and how full it is. */
export interface UnitCardBar {
	/** "HP", "MP", "EXP" - the army list's own abbreviations. */
	label: string;
	/** "12/26" for a pool, "45" for experience. */
	value: string;
	/** 0-1, how full the bar is. */
	ratio: number;
}

/** What the card says about a unit, line by line. */
export interface UnitCardLines {
	name: string;
	/** "Swordsman" */
	className: string;
	/** "Lv 3" - on the right of the class line. */
	level: string;
	/** The wound over the maximum. */
	hp: UnitCardBar;
	/** Magic left over the maximum - a unit without magic has an empty bar over "0/0". */
	mp: UnitCardBar;
	/** Points towards the next level, over a hundred. */
	experience: UnitCardBar;
	/** The readied weapon, or the "unarmed" label. */
	weapon: string;
	/** Nothing is readied - the weapon line is drawn muted. */
	unarmed: boolean;
}

/** A bar's fill, clipped so it never overflows whatever the numbers say. */
function ratio(current: number, maximum: number): number {
	return maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
}

/** The lines of the card for this unit. */
export function unitCardLines(unit: UnitData): UnitCardLines {
	return {
		name: unit.name,
		className: unit.classLabel,
		level: `${i18n("roster.level")} ${unit.level}`,
		hp: { label: i18n("roster.hp"), value: `${unit.currentHP}/${unit.stats.hp}`, ratio: ratio(unit.currentHP, unit.stats.hp) },
		// No MP is spent by anything yet, so the pool is always full.
		mp: { label: i18n("roster.mp"), value: `${unit.stats.mp}/${unit.stats.mp}`, ratio: ratio(unit.stats.mp, unit.stats.mp) },
		experience: { label: i18n("experience.label"), value: String(unit.experience), ratio: ratio(unit.experience, LEVEL_UP_EXPERIENCE) },
		weapon: unit.weapon === null ? i18n("status.unarmed") : unit.weapon.name,
		unarmed: unit.weapon === null
	};
}

/** Where the card goes: its plate, and the arrow that ties it to the tile it describes. */
export interface UnitCardPlacement {
	box: Rectangle;
	/** The card had no room above the tile and went under it instead - the arrow then points up. */
	below: boolean;
	/** Screen x of the arrow's tip: the middle of the tile, kept inside the plate when the plate had to be pushed sideways. */
	anchorX: number;
}

/**
 * Where the card sits: above `tile` (the unit's tile, in screen pixels) and
 * centred on it, with a small arrow reaching down from the plate to the token
 * it describes - a speech bubble over the unit's head. A unit too close to the
 * top of the screen gets it under the tile instead, the arrow pointing up. A
 * unit near either side edge keeps the plate on the screen and lets the arrow
 * slide along it, so the tip still lands on the tile.
 */
export function unitCardPlacement(tile: Rectangle, viewport: Dimension): UnitCardPlacement {
	const { x: tileX, y: tileY } = tile.getPosition();
	const width = UnitCard.width;
	const height = UNIT_CARD_HEIGHT;
	const reach = UnitCard.gap + UnitCard.arrow.height;

	const centreX = tileX + tile.getWidth() / 2;

	// Pushed in from the edges rather than clipped - a card half off the screen
	// says nothing.
	const x = Math.max(UnitCard.inset, Math.min(centreX - width / 2, viewport.width - UnitCard.inset - width));

	let y = tileY - reach - height;
	let below = false;

	if (y < UnitCard.inset) {
		y = tileY + tile.getHeight() + reach;
		below = true;
	}

	y = Math.max(UnitCard.inset, Math.min(y, viewport.height - UnitCard.inset - height));

	// The tip stays on the tile; the arrow itself stays clear of the plate's rounded corners.
	const margin = UnitCard.arrow.width / 2 + UnitCard.radius;
	const anchorX = Math.max(x + margin, Math.min(centreX, x + width - margin));

	return { box: new Rectangle(Math.round(x), Math.round(y), width, height), below, anchorX: Math.round(anchorX) };
}
