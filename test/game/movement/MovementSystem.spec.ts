import { test, expect, suite } from "vitest";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";

/**
 * Fire Emblem movement math: a flood fill that spends the movement budget on the
 * cost of entering each tile, stops at impassable terrain and cannot pass
 * through an occupied tile. `path` walks the same fill back for the shortest
 * route; attack range is weapon reach from anywhere it lands.
 */
suite("Movement System Test Suite", () => {
	const grid = (sketch: string[]) => GridSystem.of(parseTileMap(sketch), 1);

	const keys = (tiles: { column: number; row: number }[]) => new Set(tiles.map((tile) => MovementSystem.tileKey(tile.column, tile.row)));

	test("Open ground is reached out to the movement budget", () => {
		const reachable = MovementSystem.reachable(grid([".....", ".....", ".....", ".....", "....."]), { column: 2, row: 2 }, 2);

		expect(reachable).toHaveLength(13);
		expect(reachable.find((tile) => tile.column === 2 && tile.row === 2)?.cost).toBe(0);
		expect(reachable.find((tile) => tile.column === 4 && tile.row === 2)?.cost).toBe(2);
		expect(MovementSystem.contains(reachable, 3, 3)).toBe(true); // Manhattan distance 2
		expect(MovementSystem.contains(reachable, 3, 4)).toBe(false); // distance 3, out of budget
	});

	test("Forest costs two, so one step of it eats a budget of two", () => {
		const reachable = MovementSystem.reachable(grid(["...", "F.F", "..."]), { column: 1, row: 1 }, 1);

		expect(keys(reachable)).toStrictEqual(new Set(["1,1", "1,0", "1,2"]));
	});

	test("Walls and water are never entered", () => {
		const reachable = MovementSystem.reachable(grid([".#.", ".#.", "..."]), { column: 0, row: 0 }, 3);

		expect(keys(reachable)).toStrictEqual(new Set(["0,0", "0,1", "0,2", "1,2"]));
	});

	test("An occupied tile blocks the path through it", () => {
		const field = grid([".....", ".....", "....."]);
		const start = { column: 0, row: 1 };

		expect(MovementSystem.reachable(field, start, 4)).toHaveLength(13);

		const blocked = MovementSystem.blockedTiles([{ id: "enemy", column: 2, row: 1 }]);
		const reachable = MovementSystem.reachable(field, start, 4, blocked);

		expect(MovementSystem.contains(reachable, 2, 1)).toBe(false);
		expect(MovementSystem.contains(reachable, 3, 1)).toBe(false);
		expect(MovementSystem.contains(reachable, 1, 1)).toBe(true);
	});

	test("The mover's own tile is not one of its blockers", () => {
		const blocked = MovementSystem.blockedTiles(
			[
				{ id: "dardan", column: 1, row: 1 },
				{ id: "hasan", column: 3, row: 1 }
			],
			"dardan"
		);

		expect(blocked.has("1,1")).toBe(false);
		expect(blocked.has("3,1")).toBe(true);
	});

	test("Path is the shortest route, endpoints included, and runs straight", () => {
		const field = grid([".....", ".....", "....."]);
		const route = MovementSystem.path(field, { column: 0, row: 0 }, { column: 3, row: 0 }, 5);

		expect(route).toStrictEqual([
			{ column: 0, row: 0 },
			{ column: 1, row: 0 },
			{ column: 2, row: 0 },
			{ column: 3, row: 0 }
		]);
	});

	test("Path routes around impassable terrain and around a blocker", () => {
		const field = grid([".....", "##.##", "....."]);
		const route = MovementSystem.path(field, { column: 0, row: 0 }, { column: 0, row: 2 }, 8);

		expect(route[0]).toStrictEqual({ column: 0, row: 0 });
		expect(route.at(-1)).toStrictEqual({ column: 0, row: 2 });
		expect(route).toContainEqual({ column: 2, row: 1 }); // the one gap in the wall

		const blocked = MovementSystem.blockedTiles([{ id: "x", column: 2, row: 1 }]);
		expect(MovementSystem.path(field, { column: 0, row: 0 }, { column: 0, row: 2 }, 8, blocked)).toStrictEqual([]);
	});

	test("Path is empty when the target is out of budget", () => {
		const field = grid([".....", ".....", "....."]);
		expect(MovementSystem.path(field, { column: 0, row: 0 }, { column: 4, row: 2 }, 3)).toStrictEqual([]);
	});

	test("Attack range is weapon reach from where the unit can stand, minus those tiles", () => {
		const field = grid([".....", ".....", ".....", ".....", "....."]);
		const reachable = MovementSystem.reachable(field, { column: 2, row: 2 }, 1);
		const attack = MovementSystem.attackable(field, reachable, 1, 1);

		const reach = keys(reachable);
		for (const tile of attack) {
			expect(reach.has(MovementSystem.tileKey(tile.column, tile.row))).toBe(false);
		}

		expect(MovementSystem.contains(attack, 2, 0)).toBe(true);
		expect(MovementSystem.contains(attack, 0, 2)).toBe(true);
		expect(MovementSystem.contains(attack, 1, 1)).toBe(true);
		expect(MovementSystem.contains(attack, 2, -1)).toBe(false);
	});
});
