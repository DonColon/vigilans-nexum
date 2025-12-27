import { test, expect, suite } from "vitest";
import * as Easing from "@/core/math/animation/EasingFunctions";

suite("EasingFunctions Test Suite", () => {
	test("Linear easing returns input value", () => {
		expect(Easing.linear(0)).toBe(0);
		expect(Easing.linear(0.5)).toBe(0.5);
		expect(Easing.linear(1)).toBe(1);
	});

	// Quadratic
	test("EaseInQuad accelerates from 0 to 1", () => {
		expect(Easing.easeInQuad(0)).toBe(0);
		expect(Easing.easeInQuad(0.5)).toBe(0.25);
		expect(Easing.easeInQuad(1)).toBe(1);
	});

	test("EaseOutQuad decelerates from 0 to 1", () => {
		expect(Easing.easeOutQuad(0)).toBe(0);
		expect(Easing.easeOutQuad(0.5)).toBe(0.75);
		expect(Easing.easeOutQuad(1)).toBe(1);
	});

	test("EaseInOutQuad combines acceleration and deceleration", () => {
		expect(Easing.easeInOutQuad(0)).toBe(0);
		expect(Easing.easeInOutQuad(0.25)).toBeLessThan(0.25);
		expect(Easing.easeInOutQuad(0.5)).toBe(0.5);
		expect(Easing.easeInOutQuad(0.75)).toBeGreaterThan(0.75);
		expect(Easing.easeInOutQuad(1)).toBe(1);
	});

	// Cubic
	test("EaseInCubic accelerates", () => {
		expect(Easing.easeInCubic(0)).toBe(0);
		expect(Easing.easeInCubic(0.5)).toBe(0.125);
		expect(Easing.easeInCubic(1)).toBe(1);
	});

	test("EaseOutCubic decelerates", () => {
		expect(Easing.easeOutCubic(0)).toBe(0);
		expect(Easing.easeOutCubic(1)).toBe(1);
	});

	test("EaseInOutCubic combines cubic ease", () => {
		expect(Easing.easeInOutCubic(0)).toBe(0);
		expect(Easing.easeInOutCubic(0.5)).toBe(0.5);
		expect(Easing.easeInOutCubic(1)).toBe(1);
	});

	// Quartic
	test("EaseInQuart accelerates strongly", () => {
		expect(Easing.easeInQuart(0)).toBe(0);
		expect(Easing.easeInQuart(1)).toBe(1);
	});

	test("EaseOutQuart decelerates strongly", () => {
		expect(Easing.easeOutQuart(0)).toBe(0);
		expect(Easing.easeOutQuart(1)).toBe(1);
	});

	test("EaseInOutQuart combines strong easing", () => {
		expect(Easing.easeInOutQuart(0)).toBe(0);
		expect(Easing.easeInOutQuart(0.5)).toBe(0.5);
		expect(Easing.easeInOutQuart(1)).toBe(1);
	});

	// Quintic
	test("EaseInQuint accelerates very strongly", () => {
		expect(Easing.easeInQuint(0)).toBe(0);
		expect(Easing.easeInQuint(1)).toBe(1);
	});

	test("EaseOutQuint decelerates very strongly", () => {
		expect(Easing.easeOutQuint(0)).toBe(0);
		expect(Easing.easeOutQuint(1)).toBe(1);
	});

	test("EaseInOutQuint combines very strong easing", () => {
		expect(Easing.easeInOutQuint(0)).toBe(0);
		expect(Easing.easeInOutQuint(0.5)).toBe(0.5);
		expect(Easing.easeInOutQuint(1)).toBe(1);
	});

	// Sine
	test("EaseInSine provides smooth acceleration", () => {
		expect(Easing.easeInSine(0)).toBe(0);
		expect(Easing.easeInSine(1)).toBeCloseTo(1, 10);
	});

	test("EaseOutSine provides smooth deceleration", () => {
		expect(Easing.easeOutSine(0)).toBe(0);
		expect(Easing.easeOutSine(1)).toBeCloseTo(1, 10);
	});

	test("EaseInOutSine provides smooth easing", () => {
		expect(Easing.easeInOutSine(0)).toBeCloseTo(0, 10);
		expect(Easing.easeInOutSine(0.5)).toBeCloseTo(0.5, 1);
		expect(Easing.easeInOutSine(1)).toBeCloseTo(1, 10);
	});

	// Exponential
	test("EaseInExpo provides dramatic acceleration", () => {
		expect(Easing.easeInExpo(0)).toBe(0);
		expect(Easing.easeInExpo(1)).toBeCloseTo(1, 10);
	});

	test("EaseOutExpo provides dramatic deceleration", () => {
		expect(Easing.easeOutExpo(0)).toBeCloseTo(0, 10);
		expect(Easing.easeOutExpo(1)).toBe(1);
	});

	test("EaseInOutExpo provides dramatic easing", () => {
		expect(Easing.easeInOutExpo(0)).toBe(0);
		expect(Easing.easeInOutExpo(0.5)).toBeCloseTo(0.5, 1);
		expect(Easing.easeInOutExpo(1)).toBe(1);
	});

	// Circular
	test("EaseInCirc provides circular acceleration", () => {
		expect(Easing.easeInCirc(0)).toBe(0);
		expect(Easing.easeInCirc(1)).toBeCloseTo(1, 10);
	});

	test("EaseOutCirc provides circular deceleration", () => {
		expect(Easing.easeOutCirc(0)).toBeCloseTo(0, 10);
		expect(Easing.easeOutCirc(1)).toBe(1);
	});

	test("EaseInOutCirc provides circular easing", () => {
		expect(Easing.easeInOutCirc(0)).toBeCloseTo(0, 10);
		expect(Easing.easeInOutCirc(0.5)).toBe(0.5);
		expect(Easing.easeInOutCirc(1)).toBeCloseTo(1, 10);
	});

	// Back
	test("EaseInBack overshoots before moving forward", () => {
		expect(Easing.easeInBack(0)).toBe(0);
		expect(Easing.easeInBack(1)).toBeCloseTo(1, 10);
	});

	test("EaseOutBack overshoots after arrival", () => {
		expect(Easing.easeOutBack(0)).toBeCloseTo(0, 10);
		const midValue = Easing.easeOutBack(0.8);
		expect(midValue).toBeGreaterThan(1); // Overshoot
		expect(Easing.easeOutBack(1)).toBeCloseTo(1, 10);
	});

	test("EaseInOutBack overshoots on both ends", () => {
		expect(Easing.easeInOutBack(0)).toBeCloseTo(0, 10);
		expect(Easing.easeInOutBack(0.5)).toBe(0.5);
		expect(Easing.easeInOutBack(1)).toBeCloseTo(1, 10);
	});

	// Elastic
	test("EaseInElastic provides elastic effect", () => {
		expect(Easing.easeInElastic(0)).toBe(0);
		expect(Easing.easeInElastic(1)).toBeCloseTo(1, 10);
	});

	test("EaseOutElastic provides elastic bounce", () => {
		expect(Easing.easeOutElastic(0)).toBeCloseTo(0, 10);
		expect(Easing.easeOutElastic(1)).toBe(1);
	});

	test("EaseInOutElastic combines elastic effects", () => {
		expect(Easing.easeInOutElastic(0)).toBeCloseTo(0, 10);
		expect(Easing.easeInOutElastic(0.5)).toBe(0.5);
		expect(Easing.easeInOutElastic(1)).toBeCloseTo(1, 10);
	});

	// Bounce
	test("EaseInBounce provides bounce effect", () => {
		expect(Easing.easeInBounce(0)).toBeCloseTo(0, 10);
		expect(Easing.easeInBounce(1)).toBe(1);
	});

	test("EaseOutBounce provides bounce landing", () => {
		expect(Easing.easeOutBounce(0)).toBe(0);
		expect(Easing.easeOutBounce(1)).toBe(1);
	});

	test("EaseInOutBounce combines bounce effects", () => {
		expect(Easing.easeInOutBounce(0)).toBeCloseTo(0, 10);
		expect(Easing.easeInOutBounce(0.5)).toBe(0.5);
		expect(Easing.easeInOutBounce(1)).toBe(1);
	});

	// Edge cases
	test("Easing functions handle edge values correctly", () => {
		const easingFunctions = [
			Easing.linear, Easing.easeInQuad, Easing.easeOutQuad,
			Easing.easeInCubic, Easing.easeOutCubic,
			Easing.easeInSine, Easing.easeOutSine
		];

		easingFunctions.forEach(fn => {
			const start = fn(0);
			const end = fn(1);
			
			expect(start).toBeGreaterThanOrEqual(0);
			expect(start).toBeLessThanOrEqual(1);
			expect(end).toBeCloseTo(1, 5);
		});
	});
});
