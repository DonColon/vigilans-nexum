import { Color } from "@/core/graphics/color/Color";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { i18n } from "@/core/i18n/I18n";
import { getTerrainProperties, IMPASSABLE, TerrainType } from "@/game/map/model/Terrain";

/**
 * The terrain readout in the map's top-left corner, above the turn counter: what
 * the tile under the cursor is and what standing on it is worth. Fire Emblem
 * keeps the same box on screen at all times and swaps its contents as the cursor
 * moves, which is what this does.
 *
 * It is drawn on the same dark plate as the turn counter, in the same small
 * pixel font, so the two read as one corner rather than two widgets.
 */

// The `kenney-mini` pixel font, crisp at multiples of 8px; the fallback covers
// the frame or two before the font asset lands. See TurnHud, which shares it.
const LABEL_FAMILY = "'kenney-mini', 'Trebuchet MS', sans-serif";

/** Shown as the movement cost of a tile no unit can ever enter. */
export const IMPASSABLE_COST = "-";

export const TileInfoHud = {
	/** Gap between the plate and the map's top-left corner - the turn counter's own inset. */
	inset: 6,
	/** Inner padding of the plate around its rows. */
	padding: 6,
	/** Gap between this plate and the turn counter tucked under it. */
	gap: 4,
	/** Baseline-to-baseline distance of the rows. */
	lineHeight: 20,
	/** Narrowest the plate gets; it grows to fit a long terrain name. */
	minWidth: 168,
	/** Gap between the widest label and the value column. */
	labelGap: 12,

	font: { size: "16px", family: LABEL_FAMILY, weight: "normal" } as FontStyleSettings,
	/** Cap height over em for the font above - used to sit a row on its optical centre. */
	capRatio: 0.625,

	/**
	 * A touch more solid than the turn counter's plate: that one carries chunky
	 * sprite digits that survive anything showing through, while four rows of a
	 * 16px font need the map behind them held back.
	 */
	plate: Color.hex("#141a26f0"),
	/** The terrain's name, in the gold the UI uses for a heading. */
	name: Color.hex("#ffe07a"),
	/** The label half of a row. */
	label: Color.hex("#9aa1ad"),
	/** The value half of a row. */
	value: Color.hex("#f3ecd9"),
	/** A value worth nothing - a plain tile's defence, an impassable tile's cost. */
	muted: Color.hex("#6f7683")
} as const;

/** Name, then one row per property: the plate is always this tall, so the turn counter under it never moves. */
export const TILE_INFO_ROWS = 4;

/** Height of the plate. Fixed, whatever the tile - a box that resized as the cursor moved would be unreadable. */
export const TILE_INFO_HEIGHT = TileInfoHud.padding * 2 + TILE_INFO_ROWS * TileInfoHud.lineHeight;

/** Top edge of whatever sits under the plate - what the turn counter measures itself from. */
export const TILE_INFO_BOTTOM = TileInfoHud.inset + TILE_INFO_HEIGHT + TileInfoHud.gap;

/** One line of the readout: what it is, and what the tile scores for it. */
export interface TileInfoRow {
	label: string;
	value: string;
	/** The value is nothing worth having - drawn muted so the eye skips it. */
	muted: boolean;
}

/**
 * The tile's name in the active locale. The `name` on its properties is the
 * authoring fallback, used only for a terrain nobody has translated yet.
 */
export function terrainName(terrain: TerrainType): string {
	const key = `terrain.${terrain}`;
	const translated = i18n(key);

	return translated === key ? getTerrainProperties(terrain).name : translated;
}

/** What it costs to walk onto the tile, or a dash when nothing ever can. */
export function movementCostText(terrain: TerrainType): string {
	const { movementCost } = getTerrainProperties(terrain);

	return movementCost === IMPASSABLE ? IMPASSABLE_COST : String(movementCost);
}

/**
 * The rows under the name: what the tile costs to enter and what it gives the
 * unit standing on it. Always the same three, so the plate keeps its height and
 * the eye keeps its place as the cursor moves.
 */
export function tileInfoRows(terrain: TerrainType): TileInfoRow[] {
	const { defense, avoid } = getTerrainProperties(terrain);
	const cost = movementCostText(terrain);

	return [
		{ label: i18n("tile.cost"), value: cost, muted: cost === IMPASSABLE_COST },
		{ label: i18n("tile.defense"), value: `+${defense}`, muted: defense === 0 },
		{ label: i18n("tile.avoid"), value: `+${avoid}%`, muted: avoid === 0 }
	];
}
