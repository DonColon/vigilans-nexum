/**
 * Volume is a percentage everywhere the game talks about it, and a `GainNode`
 * multiplier everywhere the Web Audio API does. This is the one place the two
 * meet.
 *
 * A `GainNode`'s `gain` is *not* a 0-1 parameter: its `minValue` and `maxValue`
 * are the extremes of a 32-bit float, so mapping a percentage across that range
 * produces silence at 50% and a deafening, phase-inverted signal at either end.
 * Gain 0 is silence and gain 1 is the sample as recorded, which is what these
 * convert to.
 */

/** Loudest a channel goes: the sample as it was recorded, with no boost. */
export const MAX_GAIN = 1;

/** A percentage (0-100) as a gain multiplier (0-1), clamped rather than rejected. */
export function gainFromPercentage(percentage: number): number {
	if (!Number.isFinite(percentage)) {
		return MAX_GAIN;
	}

	return Math.min(Math.max(percentage, 0), 100) / 100;
}

/** A gain multiplier back as a percentage - what a volume readout shows. */
export function percentageFromGain(gain: number): number {
	if (!Number.isFinite(gain)) {
		return 100;
	}

	return Math.round(Math.min(Math.max(gain, 0), MAX_GAIN) * 100);
}
