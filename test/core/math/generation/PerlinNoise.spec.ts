import { describe, test, expect } from "vitest";
import { PerlinNoise } from "@/core/math/generation/PerlinNoise";

describe("PerlinNoise Test Suite", () => {
	test("Creates noise generator with default seed", () => {
		const noise = new PerlinNoise();
		expect(noise).toBeDefined();
	});

	test("Creates noise generator with custom seed", () => {
		const noise = new PerlinNoise(12345);
		expect(noise).toBeDefined();
	});

	test("Generates 1D noise value", () => {
		const noise = new PerlinNoise(42);
		const value = noise.noise1D(0.5);
		
		expect(value).toBeGreaterThanOrEqual(-1);
		expect(value).toBeLessThanOrEqual(1);
	});

	test("Generates 2D noise value", () => {
		const noise = new PerlinNoise(42);
		const value = noise.noise2D(0.5, 0.5);
		
		expect(value).toBeGreaterThanOrEqual(-1);
		expect(value).toBeLessThanOrEqual(1);
	});

	test("Generates 3D noise value", () => {
		const noise = new PerlinNoise(42);
		const value = noise.noise3D(0.5, 0.5, 0.5);
		
		expect(value).toBeGreaterThanOrEqual(-1);
		expect(value).toBeLessThanOrEqual(1);
	});

	test("Same inputs produce same outputs with same seed", () => {
		const noise1 = new PerlinNoise(42);
		const noise2 = new PerlinNoise(42);
		
		expect(noise1.noise2D(1.5, 2.5)).toBe(noise2.noise2D(1.5, 2.5));
	});

	test("Different seeds produce different outputs", () => {
		const noise1 = new PerlinNoise(42);
		const noise2 = new PerlinNoise(43);
		
		expect(noise1.noise2D(1.5, 2.5)).not.toBe(noise2.noise2D(1.5, 2.5));
	});
});
