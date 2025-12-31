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
});
