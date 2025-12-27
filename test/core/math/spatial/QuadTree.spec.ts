import { describe, test, expect } from "vitest";
import { QuadTree } from "@/core/math/spatial/QuadTree";
import { Vector } from "@/core/math/geometry/Vector";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Circle } from "@/core/math/geometry/Circle";

describe("QuadTree Test Suite", () => {
	test("Creates empty quad tree", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds);
		
		expect(tree).toBeDefined();
	});

	test("Inserts entity into quad tree", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds);
		
		const entity = { id: 1, shape: new Circle(50, 50, 5) };
		tree.insert(entity);
		
		expect(tree.getAllEntities().length).toBe(1);
	});

	test("Inserts multiple entities", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds);
		
		tree.insert({ id: 1, shape: new Circle(25, 25, 5) });
		tree.insert({ id: 2, shape: new Circle(75, 75, 5) });
		tree.insert({ id: 3, shape: new Circle(25, 75, 5) });
		
		expect(tree.getAllEntities().length).toBe(3);
	});

	test("Queries entities in region", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds);
		
		tree.insert({ id: 1, shape: new Circle(10, 10, 5) });
		tree.insert({ id: 2, shape: new Circle(90, 90, 5) });
		
		const query = new Rectangle(0, 0, 50, 50);
		const results = tree.query(query);
		
		expect(results.length).toBeGreaterThan(0);
	});

	test("Clears quad tree", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds);
		
		tree.insert({ id: 1, shape: new Circle(50, 50, 5) });
		tree.clear();
		
		expect(tree.getAllEntities().length).toBe(0);
	});
});
