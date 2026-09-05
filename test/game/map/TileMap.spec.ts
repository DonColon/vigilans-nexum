import { test, expect, suite } from "vitest";
import { GameError } from "@/core/GameError";
import { IMPASSABLE, Terrain, getTerrainProperties, isPassable } from "@/game/map/model/Terrain";
import { parseTileMap, skirmishMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";

suite("Tile Map Test Suite", () => {
	test("Sketch is parsed into a row major tile map", () => {
		const definition = parseTileMap(["..F", "~#O"]);

		expect(definition.columns).toBe(3);
		expect(definition.rows).toBe(2);
		expect(definition.tiles).toStrictEqual([Terrain.PLAIN, Terrain.PLAIN, Terrain.FOREST, Terrain.WATER, Terrain.WALL, Terrain.FORT]);
	});

	test("Ragged and unknown sketches are rejected", () => {
		expect(() => parseTileMap([])).toThrowError(GameError);
		expect(() => parseTileMap(["...", ".."])).toThrowError(GameError);
		expect(() => parseTileMap(["..X"])).toThrowError(GameError);
	});

	test("Placeholder map has a tile for every cell", () => {
		expect(skirmishMap.tiles).toHaveLength(skirmishMap.columns * skirmishMap.rows);
	});

	test("Grid data is built from a definition and a cell size", () => {
		const grid = GridSystem.of(skirmishMap, 32);

		expect(grid.columns).toBe(skirmishMap.columns);
		expect(grid.rows).toBe(skirmishMap.rows);
		expect(grid.cellSize).toBe(32);
		expect(GridSystem.getGridDimension(grid)).toStrictEqual({ width: skirmishMap.columns * 32, height: skirmishMap.rows * 32 });
	});

	test("Tiles are looked up by column and row", () => {
		const grid = GridSystem.of(parseTileMap(["..F", "~#O"]), 16);

		expect(GridSystem.getTerrain(grid, 2, 0)).toBe(Terrain.FOREST);
		expect(GridSystem.getTerrain(grid, 0, 1)).toBe(Terrain.WATER);
		expect(GridSystem.getTerrain(grid, 2, 1)).toBe(Terrain.FORT);
	});

	test("Tiles outside of the map are reported instead of wrapping around", () => {
		const grid = GridSystem.of(parseTileMap(["..F", "~#O"]), 16);

		expect(GridSystem.containsTile(grid, 0, 0)).toBe(true);
		expect(GridSystem.containsTile(grid, 3, 0)).toBe(false);
		expect(GridSystem.containsTile(grid, -1, 0)).toBe(false);
		expect(GridSystem.containsTile(grid, 0, 2)).toBe(false);

		expect(GridSystem.getTerrain(grid, 3, 0)).toBeNull();
		expect(GridSystem.getTerrain(grid, 0, -1)).toBeNull();
	});

	test("Terrain carries the properties a battle map needs", () => {
		expect(getTerrainProperties(Terrain.FOREST).movementCost).toBe(2);
		expect(getTerrainProperties(Terrain.WATER).movementCost).toBe(IMPASSABLE);

		expect(isPassable(Terrain.PLAIN)).toBe(true);
		expect(isPassable(Terrain.WALL)).toBe(false);
	});
});
