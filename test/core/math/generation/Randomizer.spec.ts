import { test, expect } from "vitest";
import {
	anyOf,
	randomBoolean,
	randomBooleans,
	randomDecimal,
	randomDecimals,
	randomInteger,
	randomIntegers,
	randomUUID,
	rollChance,
	rollChanceAveraged,
	seedRandom
} from "@/core/math/generation/Randomizer";

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

	values.every((value: number) => {
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

	values.every((value: number) => {
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

	values.every((value: boolean) => {
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
	{ values: [1, 2, 3, 4, 5], type: "number" as const },
	{ values: ["a", "b", "c", "d", "e"], type: "string" as const }
])("Select any $type of array", ({ values, type }) => {
	const value = anyOf<(typeof values)[number]>(values);
	expect(value).toBeTypeOf(type);
	expect(values).toContain(value);
});

test("rollChance is certain at the extremes and roughly matches the odds in between", () => {
	seedRandom(1);

	expect(rollChance(0)).toBe(false);
	expect(rollChance(-10)).toBe(false);
	expect(rollChance(100)).toBe(true);
	expect(rollChance(150)).toBe(true);

	let passes = 0;
	for (let i = 0; i < 4000; i++) {
		if (rollChance(30)) passes++;
	}

	expect(passes / 4000).toBeGreaterThan(0.24);
	expect(passes / 4000).toBeLessThan(0.36);
});

test("rollChanceAveraged pulls the real odds towards the extremes and leaves 50% alone", () => {
	seedRandom(7);

	const rate = (percent: number, samples?: number) => {
		let passes = 0;
		for (let i = 0; i < 6000; i++) {
			if (rollChanceAveraged(percent, samples)) passes++;
		}
		return passes / 6000;
	};

	expect(rate(80)).toBeGreaterThan(0.8); // displayed 80 hits more than 80% of the time
	expect(rate(20)).toBeLessThan(0.2); // displayed 20 hits less than 20%
	expect(rate(50)).toBeGreaterThan(0.44);
	expect(rate(50)).toBeLessThan(0.56);

	// One sample degrades to the plain roll.
	expect(rate(80, 1)).toBeGreaterThan(0.74);
	expect(rate(80, 1)).toBeLessThan(0.86);
});
