import { test, expect, suite } from "vitest";
import { gainFromPercentage, MAX_GAIN, percentageFromGain } from "@/core/audio/AudioVolume";

/**
 * Volume is a percentage to the game and a gain multiplier to the Web Audio
 * API. A `GainNode`'s `gain` is not a 0-1 parameter - its min and max are the
 * extremes of a 32-bit float - so mapping a percentage across *that* range is
 * the bug these exist to keep fixed: it puts silence at 50% and a deafening,
 * phase-inverted signal at either end.
 */
suite("Audio Volume Test Suite", () => {
	test("Zero per cent is silence and a hundred is the sample as recorded", () => {
		expect(gainFromPercentage(0)).toBe(0);
		expect(gainFromPercentage(100)).toBe(MAX_GAIN);
		expect(MAX_GAIN).toBe(1);
	});

	test("Half volume is half gain, not silence", () => {
		expect(gainFromPercentage(50)).toBe(0.5);
		expect(gainFromPercentage(25)).toBe(0.25);
		expect(gainFromPercentage(80)).toBeCloseTo(0.8);
	});

	test("Gain never leaves the range a gain node should be driven in", () => {
		for (const percentage of [-500, -1, 0, 50, 100, 101, 1e9]) {
			const gain = gainFromPercentage(percentage);

			expect(gain, String(percentage)).toBeGreaterThanOrEqual(0);
			expect(gain, String(percentage)).toBeLessThanOrEqual(MAX_GAIN);
		}
	});

	test("Out of range is clamped rather than thrown - a slider cannot crash the game", () => {
		expect(gainFromPercentage(-20)).toBe(0);
		expect(gainFromPercentage(300)).toBe(MAX_GAIN);
		expect(gainFromPercentage(Number.NaN)).toBe(MAX_GAIN);
		expect(gainFromPercentage(Number.POSITIVE_INFINITY)).toBe(MAX_GAIN);
	});

	test("A gain reads back as the percentage it came from", () => {
		for (const percentage of [0, 10, 40, 75, 100]) {
			expect(percentageFromGain(gainFromPercentage(percentage)), String(percentage)).toBe(percentage);
		}
	});

	test("Reading back clamps too, so a node set elsewhere still shows a sane number", () => {
		expect(percentageFromGain(-5)).toBe(0);
		expect(percentageFromGain(3.4e38)).toBe(100);
		expect(percentageFromGain(Number.NaN)).toBe(100);
	});
});
