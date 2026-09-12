import { test, expect, suite } from "vitest";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { UnitFaction } from "@/game/units/model/UnitData";
import { UnitLocation } from "@/game/units/systems/UnitSystem";

/**
 * Fire Emblem movement math: a flood fill that spends the movement budget on the
 * cost of entering each tile, stops at impassable terrain and cannot pass
 * through an enemy - an ally is walked through, but never landed on. `path`
 * walks the same fill back for the shortest route; attack range is weapon
 * reach from anywhere it lands.
 */
suite("Movement System Test Suite", () => {
	const grid = (sketch: string[]) => GridSystem.of(parseTileMap(sketch), 1);

	const keys = (tiles: { column: number; row: number }[]) => new Set(tiles.map((tile) => MovementSystem.tileKey(tile.column, tile.row)));

	const mover = { id: "mover", faction: UnitFaction.PLAYER };
	const ally = (id: string, column: number, row: number): UnitLocation => ({ id, faction: UnitFaction.PLAYER, column, row });
	const enemy = (id: string, column: number, row: number): UnitLocation => ({ id, faction: UnitFaction.ENEMY, column, row });

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

	test("An enemy's tile blocks the path through it", () => {
		const field = grid([".....", ".....", "....."]);
		const start = { column: 0, row: 1 };

		expect(MovementSystem.reachable(field, start, 4)).toHaveLength(13);

		const blocked = MovementSystem.blockedTiles([enemy("enemy", 2, 1)], mover);
		const reachable = MovementSystem.reachable(field, start, 4, blocked);

		expect(MovementSystem.contains(reachable, 2, 1)).toBe(false);
		expect(MovementSystem.contains(reachable, 3, 1)).toBe(false);
		expect(MovementSystem.contains(reachable, 1, 1)).toBe(true);
	});

	test("An ally's tile is walked through but never landed on", () => {
		const field = grid([".....", ".....", "....."]);
		const start = { column: 0, row: 1 };
		const units = [ally("friend", 2, 1)];

		const blocked = MovementSystem.blockedTiles(units, mover);
		const occupied = MovementSystem.occupiedTiles(units, mover.id);
		const reachable = MovementSystem.reachable(field, start, 4, blocked, occupied);

		expect(blocked.size).toBe(0);
		// The tile behind the ally is in reach, straight through them, at full cost.
		expect(MovementSystem.contains(reachable, 3, 1)).toBe(true);
		expect(reachable.find((tile) => tile.column === 3 && tile.row === 1)?.cost).toBe(3);
		// Their own tile is not somewhere to stop.
		expect(MovementSystem.contains(reachable, 2, 1)).toBe(false);
		// The route to the far side runs over the ally; it does not detour.
		expect(MovementSystem.path(field, start, { column: 3, row: 1 }, 4, blocked)).toContainEqual({ column: 2, row: 1 });
	});

	test("The mover's own tile is neither a blocker nor occupied", () => {
		const units = [ally("dardan", 1, 1), ally("teuta", 2, 1), enemy("hasan", 3, 1)];
		const blocked = MovementSystem.blockedTiles(units, { id: "dardan", faction: UnitFaction.PLAYER });
		const occupied = MovementSystem.occupiedTiles(units, "dardan");

		expect(blocked).toStrictEqual(new Set(["3,1"]));
		expect(occupied).toStrictEqual(new Set(["2,1", "3,1"]));
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

		const blocked = MovementSystem.blockedTiles([enemy("x", 2, 1)], mover);
		expect(MovementSystem.path(field, { column: 0, row: 0 }, { column: 0, row: 2 }, 8, blocked)).toStrictEqual([]);
	});

	test("An L-shaped route turns once instead of stair-stepping", () => {
		const field = grid([".....", ".....", "....."]);
		const route = MovementSystem.path(field, { column: 0, row: 0 }, { column: 2, row: 2 }, 6);

		expect(route).toHaveLength(5);

		const turns = route.slice(2).filter((tile, index) => {
			const previous = route[index];
			const between = route[index + 1];

			return between.column - previous.column !== tile.column - between.column || between.row - previous.row !== tile.row - between.row;
		});

		expect(turns).toHaveLength(1);
	});

	test("A tile nobody can enter is never stepped on, however much budget is left", () => {
		const field = grid([".....", "..#..", "....."]);

		expect(MovementSystem.entryCost(field, new Set(), 2, 1)).toBe(Number.POSITIVE_INFINITY);
		expect(MovementSystem.entryCost(field, new Set(["0,0"]), 0, 0)).toBe(Number.POSITIVE_INFINITY);
		expect(MovementSystem.entryCost(field, new Set(), 0, 0)).toBe(1);
		expect(MovementSystem.contains(MovementSystem.reachable(field, { column: 2, row: 0 }, 4), 2, 1)).toBe(false);
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
