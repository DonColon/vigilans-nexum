import { GameError } from "@/core/GameError";
import { Terrain, TerrainType } from "@/game/map/model/Terrain";

export interface TileMapDefinition {
	columns: number;
	rows: number;
	/** Terrain of every tile in row major order, `columns * rows` entries. */
	tiles: TerrainType[];
}

/**
 * Characters a map sketch is written with. The battle maps themselves are
 * authored as `*.tilemap.json` and shipped as assets (`src/assets/data/maps`);
 * a sketch is the compact way to spell out a terrain grid inline, which is what
 * the tests build their maps from.
 */
const legend: Record<string, TerrainType> = {
	".": Terrain.PLAIN,
	F: Terrain.FOREST,
	M: Terrain.MOUNTAIN,
	"~": Terrain.WATER,
	"#": Terrain.WALL,
	O: Terrain.FORT
};

export function parseTileMap(sketch: string[]): TileMapDefinition {
	const rows = sketch.length;

	if (rows === 0) {
		throw new GameError("Tile map needs at least one row");
	}

	const columns = sketch[0].length;
	const tiles: TerrainType[] = [];

	for (const [index, row] of sketch.entries()) {
		if (row.length !== columns) {
			throw new GameError(`Row ${index} of the tile map has ${row.length} tiles instead of ${columns}`);
		}

		for (const symbol of row) {
			const terrain = legend[symbol];

			if (terrain === undefined) {
				throw new GameError(`Symbol ${symbol} in row ${index} is not a known terrain`);
			}

			tiles.push(terrain);
		}
	}

	return { columns, rows, tiles };
}

/**
 * A sample sketch: a river splitting the field, a ford in the middle and a fort
 * on either side of it. The game builds its map from the `map-fantasy` asset -
 * this is here as a ready-made grid to exercise the map systems against.
 */
export const skirmishMap: TileMapDefinition = parseTileMap([
	"MMMM..FF....~~......",
	"MM....FF....~~...FF.",
	"M...........~~...FF.",
	"...FF...##..~~......",
	"...FF...##..~~..O...",
	"........##..........",
	"............~~......",
	"..O.........~~..FF..",
	"....FF......~~..FF..",
	"....FF......~~......",
	"........##..~~...MM.",
	"........##..~~...MM.",
	"...FF.......~~....M.",
	"...FF.......~~......",
	"MMM.........~~......"
]);
