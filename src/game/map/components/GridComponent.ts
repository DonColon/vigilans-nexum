import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Terrain, TerrainType } from "@/game/map/content/Terrain";
import { ParsedTileMap } from "@/game/map/content/TileMapFormat";
import { TileMapDefinition } from "@/game/map/content/TileMaps";

export interface GridData extends JsonSchema {
	columns: number;
	rows: number;
	/** Edge length of a single tile in pixels. */
	cellSize: number;
	/** Terrain of every tile in row major order, `columns * rows` entries. */
	tiles: TerrainType[];
	/**
	 * The cells a battle is fought on, when it is fought on less than the whole
	 * map - the rest is backdrop. Empty when every tile is in play.
	 */
	area: number[];
}

/** A rectangle of tiles. */
export interface GridArea {
	column: number;
	row: number;
	columns: number;
	rows: number;
}

/**
 * The battle map itself: how many tiles it spans and what terrain each of them
 * carries. Where the map sits on screen is not part of it - that is the job of
 * the TransformComponent on the same entity, which every tile position is
 * resolved against.
 *
 * The statics are the pure grid math over a [[GridData]]: building one from a
 * map definition, and what any caller with the data in hand - a state, a
 * command, a rule - can ask of it without a World.
 */
export class GridComponent extends Component<GridData> {
	public static readonly type = "grid";

	public static of(definition: TileMapDefinition, cellSize: number): GridData {
		return {
			columns: definition.columns,
			rows: definition.rows,
			cellSize,
			tiles: [...definition.tiles],
			area: []
		};
	}

	/**
	 * Builds the movement grid from a parsed tile map, using the terrain derived
	 * from its `tileTerrain` mapping. `cellSize` is the on-screen tile size and
	 * is independent of the tileset's source `tileWidth`.
	 */
	public static fromTileMap(map: ParsedTileMap, cellSize: number): GridData {
		return {
			columns: map.columns,
			rows: map.rows,
			cellSize,
			tiles: [...map.terrain],
			area: []
		};
	}

	public static containsTile(grid: GridData, column: number, row: number): boolean {
		return column >= 0 && column < grid.columns && row >= 0 && row < grid.rows;
	}

	/** Whether a tile is in play: on the map and, when the battle is fought on part of it, inside that part. */
	public static inPlay(grid: GridData, column: number, row: number): boolean {
		return GridComponent.containsTile(grid, column, row) && (grid.area.length === 0 || grid.area.includes(row * grid.columns + column));
	}

	/**
	 * The grid with the battle confined to `areas`: every tile outside them is a
	 * wall, so no walk, reach or plan ever leaves them. No areas leaves it as it is.
	 */
	public static confinedTo(grid: GridData, areas: readonly GridArea[]): GridData {
		if (areas.length === 0) {
			return grid;
		}

		const area = new Set<number>();

		for (const { column, row, columns, rows } of areas) {
			for (let y = row; y < row + rows; y++) {
				for (let x = column; x < column + columns; x++) {
					if (GridComponent.containsTile(grid, x, y)) {
						area.add(y * grid.columns + x);
					}
				}
			}
		}

		return { ...grid, area: [...area].sort((a, b) => a - b), tiles: grid.tiles.map((terrain, cell) => (area.has(cell) ? terrain : Terrain.WALL)) };
	}

	/**
	 * Terrain of a tile, or null when the coordinates are off the map.
	 */
	public static terrainAt(grid: GridData, column: number, row: number): TerrainType | null {
		if (!GridComponent.containsTile(grid, column, row)) {
			return null;
		}

		return grid.tiles[row * grid.columns + column];
	}

	/**
	 * Size of the whole map in pixels.
	 */
	public static dimension(grid: GridData): Dimension {
		return {
			width: grid.columns * grid.cellSize,
			height: grid.rows * grid.cellSize
		};
	}
}
