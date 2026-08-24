import { describe, test, expect } from "vitest";
import { NavMesh } from "@/core/math/pathfinding/NavMesh";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Rectangle } from "@/core/math/geometry/Rectangle";

describe("NavMesh Test Suite", () => {
	test("Creates navigation mesh", () => {
		const navmesh = new NavMesh();
		expect(navmesh).toBeDefined();
	});

	test("Creates navmesh from rectangles", () => {
		const rect = new Rectangle(0, 0, 10, 10);
		const navmesh = NavMesh.fromRectangles([rect]);

		expect(navmesh).toBeDefined();
	});

	test("Creates navmesh from grid", () => {
		const grid = [
			[true, true, true],
			[true, false, true],
			[true, true, true]
		];
		const navmesh = NavMesh.fromGrid(grid, 10);

		expect(navmesh).toBeDefined();
	});

	test("Finds path in navmesh", () => {
		const rect = new Rectangle(0, 0, 100, 100);
		const navmesh = NavMesh.fromRectangles([rect]);

		const path = navmesh.findPath(new Vector2D(10, 10), new Vector2D(90, 90));
		expect(path.length).toBeGreaterThan(0);
	});
});
