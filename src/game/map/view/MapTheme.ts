import { Color } from "@/core/graphics/color/Color";
import { Terrain, TerrainType } from "@/game/map/content/Terrain";

/**
 * Flat, high contrast palette modelled on the battle map minimaps of Fire
 * Emblem Fates and Three Houses: saturated terrain blocks, hairline grid on
 * top of them and a warm cursor that reads against every tile colour.
 */
export const MapTheme = {
	/**
	 * Edge length of a tile on screen, in pixels. The tileset art is 16x16, so
	 * this draws it at exactly 3x - a whole number of screen pixels per art
	 * pixel, which is what keeps it crisp. The screen shows about 27x15 of them
	 * (see `game.config.ts`); a bigger map scrolls (`MapCameraSystem`) and a
	 * smaller one is centred.
	 */
	cellSize: 48,

	terrain: {
		[Terrain.PLAIN]: Color.hex("#7fa653"),
		[Terrain.FOREST]: Color.hex("#3f6b3c"),
		[Terrain.BUSH]: Color.hex("#5c8a4a"),
		[Terrain.TREE]: Color.hex("#2f5233"),
		[Terrain.MOUNTAIN]: Color.hex("#8b7c62"),
		[Terrain.WATER]: Color.hex("#3a6ea5"),
		[Terrain.WALL]: Color.hex("#4a4f5c"),
		[Terrain.FORT]: Color.hex("#a4763f"),
		[Terrain.FIRE]: Color.hex("#d9622b")
	} as Record<TerrainType, Color>,

	/** Frame drawn around the whole map. */
	border: Color.hex("#141a26"),
	borderWidth: 4,

	/** Washed over the tiles a battle is not fought on, so the edge of the field reads. */
	outOfPlay: Color.hex("#0d121b8c"),

	/** Hairline between two tiles. */
	gridLine: Color.hex("#0d121b40"),
	gridLineWidth: 1,

	cursor: Color.hex("#ffe27a"),
	cursorOutline: Color.hex("#3a2a06"),
	cursorWidth: 3,
	/** Length of a cursor bracket, as a fraction of the cell size. */
	cursorBracket: 0.34
} as const;
