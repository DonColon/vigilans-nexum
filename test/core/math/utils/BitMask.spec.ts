import { test, expect, suite } from "vitest";
import { BitMask } from "@/core/math/utils/BitMask";

suite("BitMask Test Suite", () => {
	// Define some test flags
	const FLAG_A = 1 << 0; // 1
	const FLAG_B = 1 << 1; // 2
	const FLAG_C = 1 << 2; // 4
	const FLAG_D = 1 << 3; // 8

	test("Creates bitmask with default value 0", () => {
		const mask = new BitMask();
		expect(mask.value).toBe(0);
	});

	test("Creates bitmask with initial value", () => {
		const mask = new BitMask(5);
		expect(mask.value).toBe(5);
	});

	test("Sets a flag", () => {
		const mask = new BitMask();
		mask.set(FLAG_A);
		
		expect(mask.value).toBe(1);
		expect(mask.has(FLAG_A)).toBe(true);
	});

	test("Sets multiple flags", () => {
		const mask = new BitMask();
		mask.set(FLAG_A).set(FLAG_B);
		
		expect(mask.has(FLAG_A)).toBe(true);
		expect(mask.has(FLAG_B)).toBe(true);
	});

	test("Unsets a flag", () => {
		const mask = new BitMask();
		mask.set(FLAG_A).set(FLAG_B);
		mask.unset(FLAG_A);
		
		expect(mask.has(FLAG_A)).toBe(false);
		expect(mask.has(FLAG_B)).toBe(true);
	});

	test("Toggles a flag", () => {
		const mask = new BitMask();
		
		mask.toggle(FLAG_A);
		expect(mask.has(FLAG_A)).toBe(true);
		
		mask.toggle(FLAG_A);
		expect(mask.has(FLAG_A)).toBe(false);
	});

	test("Checks if flag is set", () => {
		const mask = new BitMask();
		mask.set(FLAG_A);
		
		expect(mask.has(FLAG_A)).toBe(true);
		expect(mask.has(FLAG_B)).toBe(false);
	});

	test("Checks if all flags are set", () => {
		const mask = new BitMask();
		mask.set(FLAG_A).set(FLAG_B).set(FLAG_C);
		
		expect(mask.hasAll(FLAG_A | FLAG_B)).toBe(true);
		expect(mask.hasAll(FLAG_A | FLAG_B | FLAG_C)).toBe(true);
		expect(mask.hasAll(FLAG_A | FLAG_D)).toBe(false);
	});

	test("Checks if any flags are set", () => {
		const mask = new BitMask();
		mask.set(FLAG_A);
		
		expect(mask.hasAny(FLAG_A | FLAG_B)).toBe(true);
		expect(mask.hasAny(FLAG_B | FLAG_C)).toBe(false);
	});

	test("Checks if none of the flags are set", () => {
		const mask = new BitMask();
		mask.set(FLAG_A);
		
		expect(mask.hasNone(FLAG_B | FLAG_C)).toBe(true);
		expect(mask.hasNone(FLAG_A | FLAG_B)).toBe(false);
	});

	test("Clears all flags", () => {
		const mask = new BitMask();
		mask.set(FLAG_A).set(FLAG_B).set(FLAG_C);
		mask.clear();
		
		expect(mask.value).toBe(0);
		expect(mask.has(FLAG_A)).toBe(false);
	});

	test("Sets all flags", () => {
		const mask = new BitMask();
		mask.setAll();
		
		expect(mask.value).toBe(0xFFFFFFFF);
	});

	test("Performs AND operation", () => {
		const mask1 = new BitMask(FLAG_A | FLAG_B);
		const mask2 = new BitMask(FLAG_B | FLAG_C);
		const result = mask1.intersect(mask2);
		
		expect(result.has(FLAG_A)).toBe(false);
		expect(result.has(FLAG_B)).toBe(true);
		expect(result.has(FLAG_C)).toBe(false);
	});

	test("Performs OR operation", () => {
		const mask1 = new BitMask(FLAG_A);
		const mask2 = new BitMask(FLAG_B);
		const result = mask1.combine(mask2);
		
		expect(result.has(FLAG_A)).toBe(true);
		expect(result.has(FLAG_B)).toBe(true);
	});

	test("Performs XOR operation", () => {
		const mask1 = new BitMask(FLAG_A | FLAG_B);
		const mask2 = new BitMask(FLAG_B | FLAG_C);
		const result = mask1.xor(mask2);
		
		expect(result.has(FLAG_A)).toBe(true);
		expect(result.has(FLAG_B)).toBe(false);
		expect(result.has(FLAG_C)).toBe(true);
	});

	test("Performs NOT operation", () => {
		const mask = new BitMask(FLAG_A);
		const result = mask.invert();
		
		expect(result.has(FLAG_A)).toBe(false);
		expect(result.has(FLAG_B)).toBe(true);
	});

	test("Checks equality between masks", () => {
		const mask1 = new BitMask(FLAG_A | FLAG_B);
		const mask2 = new BitMask(FLAG_A | FLAG_B);
		const mask3 = new BitMask(FLAG_C);
		
		expect(mask1.equals(mask2)).toBe(true);
		expect(mask1.equals(mask3)).toBe(false);
	});

	test("Clones bitmask", () => {
		const mask = new BitMask(FLAG_A | FLAG_B);
		const clone = mask.clone();
		
		expect(clone.value).toBe(mask.value);
		expect(clone).not.toBe(mask);
	});

	test("Converts to string", () => {
		const mask = new BitMask(5);
		const str = mask.toString();
		expect(str).toContain("101"); // Binary representation
	});

	test("Gets active flags as array", () => {
		const mask = new BitMask();
		mask.set(FLAG_A).set(FLAG_C);
		
		const flags = mask.getSetFlags();
		expect(flags).toContain(FLAG_A);
		expect(flags).toContain(FLAG_C);
		expect(flags).not.toContain(FLAG_B);
	});

	test("Counts active flags", () => {
		const mask = new BitMask();
		mask.set(FLAG_A).set(FLAG_B).set(FLAG_C);
		
		expect(mask.count()).toBe(3);
	});
});
