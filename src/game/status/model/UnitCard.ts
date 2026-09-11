import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { classLine } from "@/game/status/model/StatusScreen";
import { UnitData } from "@/game/units/model/UnitData";

/**
 * The card that pops up over a unit while the cursor rests on it - Fire
 * Emblem's hover window, drawn as a bubble above the token with an arrow down
 * to it: who it is, what it is, how hurt it is and what it is
 * holding, at a glance and without opening anything. Drawn on the same dark
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
	width: 232,
	/** Radius of the token drawn on the card's left. */
	tokenRadius: 14,
	/** Gap between the token and the text beside it. */
	tokenGap: 8,
	/** Thickness of the HP bar. */
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
	/** The empty channel of the HP bar. */
	track: Color.hex("#2b3345"),
	/** A dark border around the HP bar, so it reads on the plate. */
	barOutline: Color.hex("#0d121b")
} as const;

/** Name, class, the HP bar, the weapon: the card is always this tall. */
export const UNIT_CARD_ROWS = 4;

/** Height of the plate - fixed, whatever the unit, for the same reason the width is. */
export const UNIT_CARD_HEIGHT = UnitCard.padding * 2 + UNIT_CARD_ROWS * UnitCard.lineHeight;

/** What the card says about a unit, line by line. */
export interface UnitCardLines {
	name: string;
	/** "Swordsman - Lv 3" */
	classLine: string;
	/** "12/26" */
	hp: string;
	/** 0-1, how much of its HP the unit has left - the bar. */
	hpRatio: number;
	/** The readied weapon, or the "unarmed" label. */
	weapon: string;
	/** Nothing is readied - the weapon line is drawn muted. */
	unarmed: boolean;
}

/** The lines of the card for this unit. */
export function unitCardLines(unit: UnitData): UnitCardLines {
	const maxHP = unit.stats.hp;

	return {
		name: unit.name,
		classLine: classLine(unit),
		hp: `${unit.currentHP}/${maxHP}`,
		hpRatio: maxHP > 0 ? Math.max(0, Math.min(1, unit.currentHP / maxHP)) : 0,
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
