import { describe, test, expect } from "vitest";
import { Vector } from "../../../src/core/math/Vector";

describe("Vector Operations", () => {

	test("addition", () => {
		const value = new Vector(0, 5);
		const other = new Vector(0, 5);
		const result = value.add(other);

		expect(result.x).toBe(0);
		expect(result.y).toBe(10);
		expect(result.z).toBe(0);
	});

	test("subtraction", () => {
		const value = new Vector(5, 5);
		const other = new Vector(10, 5);
		const result = value.subtract(other);

		expect(result.x).toBe(5);
		expect(result.y).toBe(0);
		expect(result.z).toBe(0);
	});

	test("multiplication", () => {
		const value = new Vector(5, 2);
		const result = value.multiply(5);

		expect(result.x).toBe(25);
		expect(result.y).toBe(10);
		expect(result.z).toBe(0);
	});

	test("division", () => {
		const value = new Vector(25, 10);
		const result = value.divide(5);

		expect(result.x).toBe(5);
		expect(result.y).toBe(2);
		expect(result.z).toBe(0);
	});

});
