import { describe, test, expect } from "vitest";
import { GridUtils } from "@/core/math/utils/GridUtils";
import { Vector2D } from "@/core/math/geometry/Vector2D";

describe("GridUtils Test Suite", () => {
	test("Converts world position to grid coordinates", () => {
		const world = new Vector2D(45, 67);
		const grid = GridUtils.worldToGrid(world, 10);

		expect(grid.x).toBe(4);
		expect(grid.y).toBe(6);
	});

	test("Converts grid to world position (center)", () => {
		const grid = new Vector2D(2, 3);
		const world = GridUtils.gridToWorld(grid, 10);

		expect(world.x).toBe(25); // 2*10 + 5
		expect(world.y).toBe(35); // 3*10 + 5
	});

	test("Converts grid to world position (top-left)", () => {
		const grid = new Vector2D(2, 3);
		const world = GridUtils.gridToWorldTopLeft(grid, 10);

		expect(world.x).toBe(20);
		expect(world.y).toBe(30);
	});

	test("Gets 4-directional neighbors", () => {
		const neighbors = GridUtils.getNeighbors(5, 5, false);

		expect(neighbors.length).toBe(4);
		expect(neighbors).toContainEqual(new Vector2D(5, 4)); // Up
		expect(neighbors).toContainEqual(new Vector2D(6, 5)); // Right
		expect(neighbors).toContainEqual(new Vector2D(5, 6)); // Down
		expect(neighbors).toContainEqual(new Vector2D(4, 5)); // Left
	});

	test("Gets 8-directional neighbors including diagonals", () => {
		const neighbors = GridUtils.getNeighbors(5, 5, true);

		expect(neighbors.length).toBe(8);
		expect(neighbors).toContainEqual(new Vector2D(4, 4)); // Diagonal
		expect(neighbors).toContainEqual(new Vector2D(6, 6)); // Diagonal
	});

	test("Calculates Manhattan distance", () => {
		const a = new Vector2D(0, 0);
		const b = new Vector2D(3, 4);

		const distance = GridUtils.manhattanDistance(a, b);
		expect(distance).toBe(7); // |3-0| + |4-0| = 7
	});

	test("Calculates Chebyshev distance", () => {
		const a = new Vector2D(0, 0);
		const b = new Vector2D(3, 4);

		const distance = GridUtils.chebyshevDistance(a, b);
		expect(distance).toBe(4); // max(|3-0|, |4-0|) = 4
	});

	test("Generates Bresenham line cells", () => {
		const start = new Vector2D(0, 0);
		const end = new Vector2D(4, 2);

		const cells = GridUtils.bresenhamLine(start, end);
		expect(cells.length).toBeGreaterThan(2);
		expect(cells[0]).toEqual(new Vector2D(0, 0));
		expect(cells[cells.length - 1]).toEqual(new Vector2D(4, 2));
	});

	test("Gets cells in circle", () => {
		const center = new Vector2D(0, 0);
		const radius = 2;

		const cells = GridUtils.getCircle(center, radius);
		expect(cells.length).toBeGreaterThan(0);
		expect(cells).toContainEqual(new Vector2D(0, 0)); // Center
		expect(cells).toContainEqual(new Vector2D(1, 0));
		expect(cells).toContainEqual(new Vector2D(0, 1));
	});

	test("Gets cells in rectangle", () => {
		const topLeft = new Vector2D(0, 0);
		const cells = GridUtils.getRectangle(topLeft, 3, 2);

		expect(cells.length).toBe(6); // 3*2 = 6
		expect(cells).toContainEqual(new Vector2D(0, 0));
		expect(cells).toContainEqual(new Vector2D(2, 1));
	});
});
