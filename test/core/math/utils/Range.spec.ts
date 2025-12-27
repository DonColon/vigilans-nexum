import { test, expect, suite } from "vitest";
import { Range } from "@/core/math/utils/Range";

suite("Range Test Suite", () => {
	test("Creates range with min and max", () => {
		const range = new Range(0, 100);
		expect(range.min).toBe(0);
		expect(range.max).toBe(100);
	});

	test("Throws error if min > max", () => {
		expect(() => new Range(100, 0)).toThrow();
	});

	test("Creates range from max (0 to max)", () => {
		const range = Range.fromMax(100);
		expect(range.min).toBe(0);
		expect(range.max).toBe(100);
	});

	test("Creates centered range", () => {
		const range = Range.centered(50, 10);
		expect(range.min).toBe(40);
		expect(range.max).toBe(60);
	});

	test("Checks if value is contained in range", () => {
		const range = new Range(0, 100);
		expect(range.contains(50)).toBe(true);
		expect(range.contains(0)).toBe(true);
		expect(range.contains(100)).toBe(true);
		expect(range.contains(-1)).toBe(false);
		expect(range.contains(101)).toBe(false);
	});

	test("Checks if ranges overlap", () => {
		const range1 = new Range(0, 50);
		const range2 = new Range(25, 75);
		const range3 = new Range(60, 100);

		expect(range1.overlaps(range2)).toBe(true);
		expect(range1.overlaps(range3)).toBe(false);
		expect(range2.overlaps(range3)).toBe(true);
	});

	test("Clamps value to range", () => {
		const range = new Range(0, 100);
		expect(range.clamp(-10)).toBe(0);
		expect(range.clamp(50)).toBe(50);
		expect(range.clamp(150)).toBe(100);
	});

	test("Linear interpolation within range", () => {
		const range = new Range(0, 100);
		expect(range.lerp(0)).toBe(0);
		expect(range.lerp(0.5)).toBe(50);
		expect(range.lerp(1)).toBe(100);
	});

	test("Inverse lerp converts value to factor", () => {
		const range = new Range(0, 100);
		expect(range.inverseLerp(0)).toBe(0);
		expect(range.inverseLerp(50)).toBe(0.5);
		expect(range.inverseLerp(100)).toBe(1);
	});

	test("Inverse lerp handles same min/max", () => {
		const range = new Range(50, 50);
		expect(range.inverseLerp(50)).toBe(0);
	});

	test("Maps value from one range to another", () => {
		const range1 = new Range(0, 100);
		const range2 = new Range(0, 1000);
		
		expect(range1.map(50, range2)).toBe(500);
		expect(range1.map(0, range2)).toBe(0);
		expect(range1.map(100, range2)).toBe(1000);
	});

	test("Gets length of range", () => {
		const range = new Range(10, 50);
		expect(range.getLength()).toBe(40);
	});

	test("Gets center of range", () => {
		const range = new Range(0, 100);
		expect(range.getCenter()).toBe(50);
	});

	test("Gets random value within range", () => {
		const range = new Range(0, 100);
		
		for (let i = 0; i < 10; i++) {
			const random = range.random();
			expect(random).toBeGreaterThanOrEqual(0);
			expect(random).toBeLessThanOrEqual(100);
		}
	});

	test("Gets random integer within range", () => {
		const range = new Range(0, 10);
		
		for (let i = 0; i < 10; i++) {
			const random = range.randomInt();
			expect(Number.isInteger(random)).toBe(true);
			expect(random).toBeGreaterThanOrEqual(0);
			expect(random).toBeLessThanOrEqual(10);
		}
	});

	test("Expands range by amount", () => {
		const range = new Range(10, 20);
		const expanded = range.expand(5);
		
		expect(expanded.min).toBe(5);
		expect(expanded.max).toBe(25);
	});

	test("Contracts range by amount", () => {
		const range = new Range(0, 100);
		const contracted = range.shrink(10);
		
		expect(contracted.min).toBe(10);
		expect(contracted.max).toBe(90);
	});

	test("Checks equality between ranges", () => {
		const range1 = new Range(0, 100);
		const range2 = new Range(0, 100);
		const range3 = new Range(0, 50);
		
		expect(range1.equals(range2)).toBe(true);
		expect(range1.equals(range3)).toBe(false);
	});

	test("Clones range", () => {
		const range = new Range(0, 100);
		const clone = range.clone();
		
		expect(clone.min).toBe(range.min);
		expect(clone.max).toBe(range.max);
		expect(clone).not.toBe(range);
	});

	test("Converts to string", () => {
		const range = new Range(0, 100);
		expect(range.toString()).toContain("0");
		expect(range.toString()).toContain("100");
	});
});
