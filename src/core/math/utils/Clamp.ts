/**
 * Keeping a number inside a range - the one line of maths that otherwise gets
 * written out as a nested `Math.min(Math.max(...))` wherever it is needed: an
 * animation progress, a menu index, a health fraction.
 *
 * [[Range]] covers the same ground for a range that is passed around as a
 * value; these are for the throwaway case where the bounds are right there.
 */

/** `value`, held between `min` and `max` (inclusive). */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** `value`, held between 0 and 1 - a progress or a ratio. */
export function clamp01(value: number): number {
	return clamp(value, 0, 1);
}
