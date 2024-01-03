import { test, expect } from "vitest";
import { anyOf, randomBoolean, randomBooleans, randomDecimal, randomDecimals, randomInteger, randomIntegers, randomUUID } from "../../../src/core/utils/Randomizer";

test("Generate random integer", () => {
	const value = randomInteger({
		min: 0,
		max: 5
	});

	expect(value).toBeGreaterThanOrEqual(0);
	expect(value).toBeLessThanOrEqual(5);
});

test.each([
	{ min: 0, max: 5, length: 10 },
	{ min: 0, max: undefined, length: 10 }
])("Generate $length random integers (min: $min, max: $max)", ({ min, max, length }) => {
	const values = randomIntegers(length, { min, max });

	expect(values).toHaveLength(length);

	values.every((value) => {
		expect(value).toBeGreaterThanOrEqual(min || 0);
		expect(value).toBeLessThanOrEqual(max || Number.MAX_SAFE_INTEGER);
	});
});

test("Generate random decimal", () => {
	const value = randomDecimal({
		min: 0,
		max: 5
	});

	expect(value).toBeGreaterThanOrEqual(0);
	expect(value).toBeLessThanOrEqual(5);
});

test.each([
	{ min: 0, max: 5, length: 10 },
	{ min: 0, max: undefined, length: 10 }
])("Generate $length random decimals (min: $min, max: $max)", ({ min, max, length }) => {
	const values = randomDecimals(length, { min, max });

	expect(values).toHaveLength(length);

	values.every((value) => {
		expect(value).toBeGreaterThanOrEqual(min || 0);
		expect(value).toBeLessThanOrEqual(max || Number.MAX_VALUE);
	});
});

test("Generate random boolean", () => {
	const value = randomBoolean();
	expect(value).toBeTypeOf("boolean");
});

test("Generate 10 random booleans", () => {
	const values = randomBooleans(10);

	expect(values).toHaveLength(10);

	values.every((value) => {
		expect(value).toBeTypeOf("boolean");
	});
});

test("Generate random uuid v4", () => {
	const format = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
	const value = randomUUID();

	expect(value).toMatch(format);
	expect(value).toHaveLength(36);
});

test.each([
	{ values: [1, 2, 3, 4, 5], type: "number" },
	{ values: ["a", "b", "c", "d", "e"], type: "string" }
])("Select any $type of array", ({ values, type }) => {
	const value = anyOf(values);
	expect(value).toBeTypeOf(type);
	expect(values).toContain(value);
});