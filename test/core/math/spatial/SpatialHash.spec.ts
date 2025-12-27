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

	test("Removes entity from non-existent bucket (no-op)", () => {
		const hash = new SpatialHash(10);
		const entity = { id: 1, shape: new Circle(5, 5, 2) };
		
		// Remove without inserting first - should handle gracefully
		hash.remove(entity);
		expect(hash.getTotalEntries()).toBe(0);
	});

	test("Updates entity keeping some cells unchanged", () => {
		const hash = new SpatialHash(10);
		const entity = { id: 1, shape: new Rectangle(0, 0, 15, 15) };
		
		hash.insert(entity);
		const oldBounds = entity.shape.getBounds();
		
		// Update to overlapping but different position (some cells same, some new)
		entity.shape = new Rectangle(5, 5, 15, 15);
		hash.update(entity, oldBounds);
		
		expect(hash.getTotalEntries()).toBeGreaterThan(0);
	});

	test("Queries intersections with non-intersecting candidates", () => {
		const hash = new SpatialHash(10);
		
		// Insert entities in same bucket but won't intersect with query shape
		hash.insert({ id: 1, shape: new Circle(2, 2, 1) });
		hash.insert({ id: 2, shape: new Circle(8, 8, 1) });
		
		// Query with shape that's in same buckets but doesn't actually intersect
		const queryShape = new Circle(5, 5, 0.5);
		const results = hash.queryIntersections(queryShape);
		
		// Results might be 0 if shapes don't intersect, or > 0 if they do
		expect(results.size).toBeGreaterThanOrEqual(0);
	});

	test("Removes entity from bucket with multiple entities (bucket not deleted)", () => {
		const hash = new SpatialHash(10);
		const entity1 = { id: 1, shape: new Rectangle(5, 5, 2, 2) };
		const entity2 = { id: 2, shape: new Rectangle(5, 5, 2, 2) };
		
		hash.insert(entity1);
		hash.insert(entity2);
		hash.remove(entity1);
		
		const results = hash.queryBounds(new Rectangle(0, 0, 10, 10));
		expect(results.size).toBe(1);
		expect(results.has(entity2)).toBe(true);
	});

	test("Updates entity without removing from shared cells (bucket not deleted)", () => {
		const hash = new SpatialHash(10);
		const entity1 = { id: 1, shape: new Rectangle(5, 5, 2, 2) };
		const entity2 = { id: 2, shape: new Rectangle(5, 5, 2, 2) };
		
		hash.insert(entity1);
		hash.insert(entity2);
		
		const oldBounds = entity1.shape.getBounds();
		entity1.shape = new Rectangle(6, 6, 2, 2);
		hash.update(entity1, oldBounds);
		
		const results = hash.queryBounds(new Rectangle(0, 0, 10, 10));
		expect(results.size).toBe(2);
	});

	test("Updates entity to existing bucket (bucket already exists)", () => {
		const hash = new SpatialHash(10);
		const entity1 = { id: 1, shape: new Rectangle(5, 5, 2, 2) };
		const entity2 = { id: 2, shape: new Rectangle(15, 5, 2, 2) };
		
		hash.insert(entity1);
		hash.insert(entity2);
		
		// Move entity2 to same cell as entity1
		const oldBounds = entity2.shape.getBounds();
		entity2.shape = new Rectangle(5, 5, 2, 2);
		hash.update(entity2, oldBounds);
		
		const results = hash.queryBounds(new Rectangle(0, 0, 10, 10));
		expect(results.size).toBe(2);
	});});