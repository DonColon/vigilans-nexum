import { Dimension } from "@/core/math/geometry/Dimension";
import { GridData } from "@/game/map/components/GridComponent";
import { TerrainType } from "@/game/map/model/Terrain";
import { ParsedTileMap } from "@/game/map/model/TileMapFormat";
import { TileMapDefinition } from "@/game/map/model/TileMaps";

/**
 * Pure grid math kept off GridComponent, whose job is to hold data only. Not
 * a registered ECS system - it never runs against queries or a World, which
 * is exactly why MapState and MoveCursorCommand can call it directly without
 * depending on the systems that do run every frame.
 */
export class GridSystem {
	public static of(definition: TileMapDefinition, cellSize: number): GridData {
		return {
			columns: definition.columns,
			rows: definition.rows,
			cellSize,
			tiles: [...definition.tiles]
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
			tiles: [...map.terrain]
		};
	}

	public static containsTile(grid: GridData, column: number, row: number): boolean {
		return column >= 0 && column < grid.columns && row >= 0 && row < grid.rows;
	}

	/**
	 * Terrain of a tile, or null when the coordinates are off the map.
	 */
	public static getTerrain(grid: GridData, column: number, row: number): TerrainType | null {
		if (!GridSystem.containsTile(grid, column, row)) {
			return null;
		}

		return grid.tiles[row * grid.columns + column];
	}

	/**
	 * Size of the whole map in pixels.
	 */
	public static getGridDimension(grid: GridData): Dimension {
		return {
			width: grid.columns * grid.cellSize,
			height: grid.rows * grid.cellSize
		};
	}
}
