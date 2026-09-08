import { describe, test, expect } from "vitest";
import { AStar } from "@/core/math/pathfinding/AStar";
import { Vector2D } from "@/core/math/geometry/Vector2D";

describe("AStar Test Suite", () => {
	test("Creates A* pathfinder with grid dimensions", () => {
		const astar = new AStar(10, 10);
		expect(astar).toBeDefined();
	});

	test("Creates pathfinder from walkable map", () => {
		const walkableMap = [
			[true, true, true],
			[true, false, true],
			[true, true, true]
		];
		const astar = AStar.fromMap(walkableMap);
		expect(astar).toBeDefined();
	});

	test("Finds path in grid", () => {
		const walkableMap = [
			[true, true, true, true],
			[true, true, true, true],
			[true, true, true, true]
		];
		const astar = AStar.fromMap(walkableMap);
		const result = astar.findPath(new Vector2D(0, 0), new Vector2D(3, 2));

		expect(result.success).toBe(true);
		expect(result.path.length).toBeGreaterThan(0);
	});

	test("Returns failed result when no path exists", () => {
		const walkableMap = [
			[true, false, true],
			[false, false, false],
			[true, false, true]
		];
		const astar = AStar.fromMap(walkableMap);
		const result = astar.findPath(new Vector2D(0, 0), new Vector2D(2, 2));

		expect(result.success).toBe(false);
		expect(result.path.length).toBe(0);
	});

	test("A per-tile cost is spent instead of the flat step cost", () => {
		const astar = new AStar(5, 1);
		// Every tile costs 1 but the middle one, which costs 4.
		const result = astar.findPath(new Vector2D(0, 0), new Vector2D(4, 0), { allowDiagonal: false, cost: (position) => (position.x === 2 ? 4 : 1) });

		expect(result.success).toBe(true);
		expect(result.path).toHaveLength(5);
	});

	test("A tile costing Infinity cannot be entered", () => {
		const astar = new AStar(3, 3);
		const wall = (position: Vector2D) => (position.x === 1 ? Number.POSITIVE_INFINITY : 1);

		const result = astar.findPath(new Vector2D(0, 1), new Vector2D(2, 1), { allowDiagonal: false, cost: wall });

		expect(result.success).toBe(false);
	});

	test("Reachable area stops at the budget and reports what each tile cost", () => {
		const astar = new AStar(5, 5);
		const area = astar.findReachable(new Vector2D(2, 2), 2, { allowDiagonal: false });

		expect(area.getNodes()).toHaveLength(13); // the diamond of Manhattan distance 2
		expect(area.getCost(new Vector2D(2, 2))).toBe(0);
		expect(area.getCost(new Vector2D(4, 2))).toBe(2);
		expect(area.contains(new Vector2D(3, 3))).toBe(true);
		expect(area.contains(new Vector2D(3, 4))).toBe(false);
		expect(area.getCost(new Vector2D(3, 4))).toBeNull();
	});

	test("Rough ground eats the budget it costs", () => {
		const astar = new AStar(5, 1);
		const area = astar.findReachable(new Vector2D(0, 0), 2, { allowDiagonal: false, cost: (position) => (position.x === 1 ? 2 : 1) });

		expect(area.contains(new Vector2D(1, 0))).toBe(true);
		expect(area.getCost(new Vector2D(1, 0))).toBe(2);
		expect(area.contains(new Vector2D(2, 0))).toBe(false);
	});

	test("Reachable area hands back the route to any tile it settled", () => {
		const astar = new AStar(4, 4);
		const area = astar.findReachable(new Vector2D(0, 0), 4, { allowDiagonal: false, preferStraight: true });

		const route = area.pathTo(new Vector2D(3, 0));

		expect(route.map((position) => [position.x, position.y])).toStrictEqual([
			[0, 0],
			[1, 0],
			[2, 0],
			[3, 0]
		]);

		expect(area.pathTo(new Vector2D(3, 3))).toStrictEqual([]);
	});

	test("An area outside the grid is empty", () => {
		const astar = new AStar(3, 3);
		const area = astar.findReachable(new Vector2D(9, 9), 5);

		expect(area.getNodes()).toStrictEqual([]);
		expect(area.pathTo(new Vector2D(0, 0))).toStrictEqual([]);
	});
});
