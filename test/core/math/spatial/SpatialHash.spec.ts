import { describe, test, expect } from "vitest";
import { SpatialHash } from "@/core/math/spatial/SpatialHash";
import { Vector } from "@/core/math/geometry/Vector";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Circle } from "@/core/math/geometry/Circle";

describe("SpatialHash Test Suite", () => {
	test("Creates spatial hash with cell size", () => {
		const hash = new SpatialHash(10);
		expect(hash).toBeDefined();
	});

	test("Inserts object into spatial hash", () => {
		const hash = new SpatialHash(10);
		const obj = { id: 1, shape: new Circle(15, 25, 5) };
		
		hash.insert(obj);
		expect(hash.getTotalEntries()).toBeGreaterThan(0);
	});

	test("Inserts multiple objects", () => {
		const hash = new SpatialHash(10);
		
		hash.insert({ id: 1, shape: new Circle(5, 5, 5) });
		hash.insert({ id: 2, shape: new Circle(15, 15, 5) });
		hash.insert({ id: 3, shape: new Circle(25, 25, 5) });
		
		expect(hash.getTotalEntries()).toBeGreaterThan(0);
	});

	test("Queries objects in region", () => {
		const hash = new SpatialHash(10);
		
		hash.insert({ id: 1, shape: new Circle(5, 5, 5) });
		hash.insert({ id: 2, shape: new Circle(95, 95, 5) });
		
		const query = new Rectangle(0, 0, 50, 50);
		const results = hash.queryBounds(query);
		
		expect(results.size).toBeGreaterThan(0);
	});

	test("Removes object from spatial hash", () => {
		const hash = new SpatialHash(10);
		const obj = { id: 1, shape: new Circle(5, 5, 5) };
		
		hash.insert(obj);
		hash.remove(obj);
		
		expect(hash.getTotalEntries()).toBe(0);
	});

	test("Clears spatial hash", () => {
		const hash = new SpatialHash(10);
		
		hash.insert({ id: 1, shape: new Circle(5, 5, 5) });
		hash.clear();
		
		expect(hash.getTotalEntries()).toBe(0);
	});
});

describe("SpatialHash Advanced Queries Test Suite", () => {
	test("Queries by position", () => {
		const hash = new SpatialHash(10);
		hash.insert({ id: 1, shape: new Circle(5, 5, 5) });
		
		const results = hash.queryPosition(new Vector(5, 5));
		expect(results.size).toBeGreaterThan(0);
	});

	test("Queries by radius", () => {
		const hash = new SpatialHash(10);
		hash.insert({ id: 1, shape: new Circle(5, 5, 3) });
		
		const results = hash.queryRadius(new Vector(5, 5), 10);
		expect(results.size).toBeGreaterThan(0);
	});

	test("Queries by shape intersection", () => {
		const hash = new SpatialHash(10);
		hash.insert({ id: 1, shape: new Circle(5, 5, 3) });
		
		const queryShape = new Rectangle(0, 0, 10, 10);
		const results = hash.queryIntersections(queryShape);
		expect(results.size).toBeGreaterThan(0);
	});

	test("Updates entity position", () => {
		const hash = new SpatialHash(10);
		const entity = { id: 1, shape: new Circle(5, 5, 2) };
		
		hash.insert(entity);
		const oldBounds = entity.shape.getBounds();
		
		// Update entity shape
		entity.shape = new Circle(25, 25, 2);
		hash.update(entity, oldBounds);
		
		const results = hash.queryPosition(new Vector(25, 25));
		expect(results.size).toBeGreaterThan(0);
	});

	test("Gets bucket count", () => {
		const hash = new SpatialHash(10);
		hash.insert({ id: 1, shape: new Circle(5, 5, 2) });
		
		expect(hash.getBucketCount()).toBeGreaterThan(0);
	});
});
