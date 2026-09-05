import { GameError } from "@/core/GameError";
import { Terrain, TerrainType } from "@/game/map/model/Terrain";

/**
 * On-disk tile map. Authored as a `.tilemap.json` file and either imported
 * directly or loaded as a `json` asset - `parseTileMapDocument` accepts the
 * parsed object either way. See `docs/tilemaps.md` for the full reference.
 *
 * A frame index of -1 means "no tile" in that cell of that layer. Layers are
 * listed bottom first and drawn in order. Frame indices address the tileset
 * spritesheet row major, `index = row * columns + column`, starting at zero.
 */
export interface TileMapDocument {
	format: "vigilans-tilemap";
	version: 1;
	columns: number;
	rows: number;
	/** Source tile size in the tileset, in pixels. */
	tileWidth: number;
	tileHeight: number;
	/** Asset id of the spritesheet the frame indices point into. */
	tileset: string;
	/**
	 * Colour painted under the whole map before the layers, `#rgb`/`#rrggbb`/
	 * `#rrggbbaa`. Needed when the tileset draws its art on transparency (the
	 * Kenney "colored-transparent" sheets) so cells with only a see-through tile,
	 * or none, still read as ground rather than showing the canvas.
	 */
	background?: string;
	layers: TileMapLayer[];
	/** Frame index (as a string key) to the terrain the gameplay grid should use. */
	tileTerrain?: Record<string, TerrainType>;
	/** Terrain for any tile not listed in `tileTerrain`. Defaults to `plain`. */
	defaultTerrain?: TerrainType;
}

export interface TileMapLayer {
	name: string;
	/** `columns * rows` frame indices in row major order, -1 for an empty cell. */
	tiles: number[];
	/**
	 * Optional per-cell orientation, same length as `tiles`. Each entry is a bit
	 * mask of {@link TileFlip}; 0 (or the whole array left out) means upright.
	 * Matches the flip flags Tiled writes, so a Tiled CSV export drops straight
	 * in once the flags are split off the tile ids.
	 */
	flips?: number[];
}

export const EMPTY_TILE = -1;

/** Orientation bits carried per cell in a layer's `flips` array. */
export const TileFlip = {
	/** Mirror along the vertical axis (swap left and right). */
	HORIZONTAL: 1,
	/** Mirror along the horizontal axis (swap top and bottom). */
	VERTICAL: 2,
	/** Mirror along the main diagonal (transpose). Combined with the other two
	 *  this covers every 90 degree rotation. */
	DIAGONAL: 4
} as const;

const MAX_FLIP = TileFlip.HORIZONTAL | TileFlip.VERTICAL | TileFlip.DIAGONAL;

/**
 * A validated tile map ready to be turned into components: visual layers for the
 * renderer and a derived terrain grid for movement, line of sight and the rest
 * of the gameplay that only cares what a tile *is*, not what it looks like.
 */
export interface ParsedTileMap {
	columns: number;
	rows: number;
	tileWidth: number;
	tileHeight: number;
	tileset: string;
	/** Ground colour, or `null` when the document left it out. */
	background: string | null;
	/** Every layer carries a `flips` array here, zero-filled when the document left it out. */
	layers: Required<TileMapLayer>[];
	/** Terrain of every tile in row major order, `columns * rows` entries. */
	terrain: TerrainType[];
}

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const terrainValues = new Set<string>(Object.values(Terrain));

function assertTerrain(value: string, where: string): TerrainType {
	if (!terrainValues.has(value)) {
		throw new GameError(`${where} refers to unknown terrain "${value}"`);
	}

	return value as TerrainType;
}

export function parseTileMapDocument(document: TileMapDocument): ParsedTileMap {
	if (document.format !== "vigilans-tilemap") {
		throw new GameError(`Tile map has format "${document.format}", expected "vigilans-tilemap"`);
	}

	if (document.version !== 1) {
		throw new GameError(`Tile map has version ${document.version}, this build reads version 1`);
	}

	const { columns, rows, tileWidth, tileHeight, tileset } = document;

	if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns <= 0 || rows <= 0) {
		throw new GameError(`Tile map needs a positive integer size, got ${columns}x${rows}`);
	}

	if (!Number.isInteger(tileWidth) || !Number.isInteger(tileHeight) || tileWidth <= 0 || tileHeight <= 0) {
		throw new GameError(`Tile map needs a positive integer tile size, got ${tileWidth}x${tileHeight}`);
	}

	if (typeof tileset !== "string" || tileset.length === 0) {
		throw new GameError(`Tile map is missing its tileset asset id`);
	}

	if (document.background !== undefined && !HEX_COLOUR.test(document.background)) {
		throw new GameError(`Tile map background "${document.background}" is not a hex colour`);
	}

	if (!Array.isArray(document.layers) || document.layers.length === 0) {
		throw new GameError(`Tile map needs at least one layer`);
	}

	const cellCount = columns * rows;
	const layers: Required<TileMapLayer>[] = document.layers.map((layer, index) => {
		if (typeof layer.name !== "string" || layer.name.length === 0) {
			throw new GameError(`Layer ${index} of the tile map is missing its name`);
		}

		if (!Array.isArray(layer.tiles) || layer.tiles.length !== cellCount) {
			throw new GameError(`Layer "${layer.name}" has ${layer.tiles?.length ?? 0} tiles instead of ${cellCount}`);
		}

		for (const [cell, frame] of layer.tiles.entries()) {
			if (!Number.isInteger(frame) || frame < EMPTY_TILE) {
				throw new GameError(`Layer "${layer.name}" has an invalid frame ${frame} at cell ${cell}`);
			}
		}

		const flips = new Array<number>(cellCount).fill(0);

		if (layer.flips !== undefined) {
			if (!Array.isArray(layer.flips) || layer.flips.length !== cellCount) {
				throw new GameError(`Layer "${layer.name}" has ${layer.flips?.length ?? 0} flips instead of ${cellCount}`);
			}

			for (const [cell, flip] of layer.flips.entries()) {
				if (!Number.isInteger(flip) || flip < 0 || flip > MAX_FLIP) {
					throw new GameError(`Layer "${layer.name}" has an invalid flip ${flip} at cell ${cell}`);
				}

				flips[cell] = flip;
			}
		}

		return { name: layer.name, tiles: [...layer.tiles], flips };
	});

	const defaultTerrain = document.defaultTerrain ? assertTerrain(document.defaultTerrain, "defaultTerrain") : Terrain.PLAIN;

	const tileTerrain = new Map<number, TerrainType>();
	for (const [frame, terrain] of Object.entries(document.tileTerrain ?? {})) {
		const index = Number(frame);

		if (!Number.isInteger(index) || index < 0) {
			throw new GameError(`tileTerrain key "${frame}" is not a frame index`);
		}

		tileTerrain.set(index, assertTerrain(terrain, `tileTerrain["${frame}"]`));
	}

	const terrain = deriveTerrain(layers, cellCount, tileTerrain, defaultTerrain);

	return { columns, rows, tileWidth, tileHeight, tileset, background: document.background ?? null, layers, terrain };
}

/**
 * Terrain of a cell is decided by the topmost layer that puts a tile there whose
 * frame is mapped in `tileTerrain` - a forest drawn over grass counts as forest,
 * grass with nothing on top stays grass. Cells no mapped tile covers fall back
 * to `defaultTerrain`.
 */
function deriveTerrain(layers: TileMapLayer[], cellCount: number, tileTerrain: Map<number, TerrainType>, defaultTerrain: TerrainType): TerrainType[] {
	const terrain: TerrainType[] = new Array(cellCount).fill(defaultTerrain);

	for (let cell = 0; cell < cellCount; cell++) {
		for (let layer = layers.length - 1; layer >= 0; layer--) {
			const frame = layers[layer].tiles[cell];
			const mapped = tileTerrain.get(frame);

			if (mapped !== undefined) {
				terrain[cell] = mapped;
				break;
			}
		}
	}

	return terrain;
}
