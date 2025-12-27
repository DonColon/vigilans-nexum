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

	test("Rejects entity outside bounds", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds);
		
		const entity = { id: 1, shape: new Circle(200, 200, 5) };
		const result = tree.insert(entity);
		
		expect(result).toBe(false);
		expect(tree.getAllEntities().length).toBe(0);
	});

	test("Subdivides when capacity exceeded", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds, 2); // Capacity of 2
		
		// Insert more than capacity to trigger subdivision
		tree.insert({ id: 1, shape: new Circle(10, 10, 5) });
		tree.insert({ id: 2, shape: new Circle(20, 20, 5) });
		tree.insert({ id: 3, shape: new Circle(30, 30, 5) });
		tree.insert({ id: 4, shape: new Circle(40, 40, 5) });
		tree.insert({ id: 5, shape: new Circle(50, 50, 5) });
		
		expect(tree.getAllEntities().length).toBe(5);
	});

	test("Subdivides and redistributes entities correctly", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds, 2); // Capacity of 2
		
		// Insert entities that will be redistributed after subdivision
		tree.insert({ id: 1, shape: new Circle(10, 10, 5) }); // NW
		tree.insert({ id: 2, shape: new Circle(15, 15, 5) }); // NW
		tree.insert({ id: 3, shape: new Circle(85, 85, 5) }); // SE - triggers subdivision
		
		// Verify all entities are still in the tree after redistribution
		expect(tree.getAllEntities().length).toBe(3);
	});

	test("Handles max depth by keeping entities in node when cannot subdivide", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds, 1, 0); // Max depth 0 = no subdivision allowed
		
		// Insert multiple entities - should all stay in root since can't subdivide
		tree.insert({ id: 1, shape: new Circle(10, 10, 2) });
		tree.insert({ id: 2, shape: new Circle(20, 20, 2) });
		tree.insert({ id: 3, shape: new Circle(30, 30, 2) });
		
		// All entities should be stored in this node despite exceeding capacity
		expect(tree.getAllEntities().length).toBe(3);
	});

	test("Query returns empty when range doesn't intersect", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds);
		
		tree.insert({ id: 1, shape: new Circle(10, 10, 5) });
		tree.insert({ id: 2, shape: new Circle(20, 20, 5) });
		
		const query = new Rectangle(200, 200, 50, 50); // Far outside
		const results = tree.query(query);
		
		expect(results.length).toBe(0);
	});

	test("Query recursively searches subdivisions", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds, 2);
		
		// Add enough entities to trigger subdivision
		tree.insert({ id: 1, shape: new Circle(10, 10, 5) });
		tree.insert({ id: 2, shape: new Circle(15, 15, 5) });
		tree.insert({ id: 3, shape: new Circle(80, 80, 5) });
		tree.insert({ id: 4, shape: new Circle(85, 85, 5) });
		tree.insert({ id: 5, shape: new Circle(10, 85, 5) });
		
		// Query specific region
		const queryNW = new Rectangle(0, 0, 50, 50);
		const resultsNW = tree.query(queryNW);
		expect(resultsNW.length).toBeGreaterThan(0);
		
		const querySE = new Rectangle(50, 50, 50, 50);
		const resultsSE = tree.query(querySE);
		expect(resultsSE.length).toBeGreaterThan(0);
	});

	test("getAllEntities returns entities from all subdivisions", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds, 2);
		
		// Add entities in different quadrants to force subdivision
		tree.insert({ id: 1, shape: new Circle(10, 10, 5) }); // NW
		tree.insert({ id: 2, shape: new Circle(15, 15, 5) }); // NW
		tree.insert({ id: 3, shape: new Circle(80, 10, 5) }); // NE
		tree.insert({ id: 4, shape: new Circle(10, 80, 5) }); // SW
		tree.insert({ id: 5, shape: new Circle(80, 80, 5) }); // SE
		
		const all = tree.getAllEntities();
		expect(all.length).toBe(5);
	});

	test("Clears subdivided tree", () => {
		const bounds = new Rectangle(0, 0, 100, 100);
		const tree = new QuadTree(bounds, 2);
		
		// Create subdivisions
		tree.insert({ id: 1, shape: new Circle(10, 10, 5) });
		tree.insert({ id: 2, shape: new Circle(20, 20, 5) });
		tree.insert({ id: 3, shape: new Circle(80, 80, 5) });
		
		tree.clear();
		
		expect(tree.getAllEntities().length).toBe(0);
	});
});
