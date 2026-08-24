/**
 * Easing Functions for smooth animations and transitions.
 *
 * Easing functions control how values change over time, creating natural-looking
 * motion instead of robotic linear interpolation.
 *
 * Categories:
 * - Ease In: Starts slow, accelerates (good for exits)
 * - Ease Out: Starts fast, decelerates (good for entrances, feels responsive)
 * - Ease In-Out: Accelerates then decelerates (good for complete movements)
 *
 * Common use cases:
 * - UI animations (buttons, panels, menus)
 * - Camera movements (smooth following, transitions)
 * - Player feedback (hit effects, jumps, dashes)
 * - Particle effects (smoke, explosions, trails)
 * - Value interpolation (health bars, progress bars)
 * - Game feel polish (screen shake, slow-motion transitions)
 *
 * @param t - Progress value between 0 and 1
 * @returns Eased value, typically between 0 and 1 (some functions overshoot)
 */

/**
 * Linear interpolation (no easing, constant speed)
 */
export function linear(t: number): number {
	return t;
}

// ============================================================================
// QUADRATIC EASING (t^2) - Gentle acceleration/deceleration
// ============================================================================

/**
 * Quadratic ease in - gentle acceleration
 * Good for: Subtle speed-ups
 */
export function easeInQuad(t: number): number {
	return t * t;
}

/**
 * Quadratic ease out - gentle deceleration
 * Good for: UI elements appearing, smooth stops
 */
export function easeOutQuad(t: number): number {
	return t * (2 - t);
}

/**
 * Quadratic ease in-out - gentle acceleration and deceleration
 * Good for: Complete movements, position changes
 */
export function easeInOutQuad(t: number): number {
	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ============================================================================
// CUBIC EASING (t^3) - Medium acceleration/deceleration
// ============================================================================

/**
 * Cubic ease in - medium acceleration
 * Good for: Moderate speed-ups
 */
export function easeInCubic(t: number): number {
	return t * t * t;
}

/**
 * Cubic ease out - medium deceleration
 * Good for: Smooth arrivals, camera movements
 */
export function easeOutCubic(t: number): number {
	const t1 = t - 1;
	return t1 * t1 * t1 + 1;
}

/**
 * Cubic ease in-out - medium acceleration and deceleration
 * Good for: Natural object movements
 */
export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// ============================================================================
// QUARTIC EASING (t^4) - Strong acceleration/deceleration
// ============================================================================

/**
 * Quartic ease in - strong acceleration
 * Good for: Fast speed-ups
 */
export function easeInQuart(t: number): number {
	return t * t * t * t;
}

/**
 * Quartic ease out - strong deceleration
 * Good for: Dramatic stops, impacts
 */
export function easeOutQuart(t: number): number {
	const t1 = t - 1;
	return 1 - t1 * t1 * t1 * t1;
}

/**
 * Quartic ease in-out - strong acceleration and deceleration
 */
export function easeInOutQuart(t: number): number {
	const t1 = t - 1;
	return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * t1 * t1 * t1 * t1;
}

// ============================================================================
// QUINTIC EASING (t^5) - Very strong acceleration/deceleration
// ============================================================================

/**
 * Quintic ease in - very strong acceleration
 */
export function easeInQuint(t: number): number {
	return t * t * t * t * t;
}

/**
 * Quintic ease out - very strong deceleration
 */
export function easeOutQuint(t: number): number {
	const t1 = t - 1;
	return 1 + t1 * t1 * t1 * t1 * t1;
}

/**
 * Quintic ease in-out - very strong acceleration and deceleration
 */
export function easeInOutQuint(t: number): number {
	const t1 = t - 1;
	return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * t1 * t1 * t1 * t1 * t1;
}

// ============================================================================
// SINE EASING - Smooth, natural acceleration/deceleration
// ============================================================================

/**
 * Sine ease in - smooth acceleration
 * Good for: Organic movements, pendulum-like motion
 */
export function easeInSine(t: number): number {
	return 1 - Math.cos((t * Math.PI) / 2);
}

/**
 * Sine ease out - smooth deceleration
 * Good for: Natural arrivals, gentle stops
 */
export function easeOutSine(t: number): number {
	return Math.sin((t * Math.PI) / 2);
}

/**
 * Sine ease in-out - smooth acceleration and deceleration
 * Good for: Wave-like motions, floating objects
 */
export function easeInOutSine(t: number): number {
	return -(Math.cos(Math.PI * t) - 1) / 2;
}

// ============================================================================
// EXPONENTIAL EASING - Dramatic acceleration/deceleration
// ============================================================================

/**
 * Exponential ease in - dramatic acceleration
 * Good for: Explosions, fast zoom-ins
 */
export function easeInExpo(t: number): number {
	return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

/**
 * Exponential ease out - dramatic deceleration
 * Good for: Rapid arrivals with smooth stop
 */
export function easeOutExpo(t: number): number {
	return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Exponential ease in-out
 */
export function easeInOutExpo(t: number): number {
	if (t === 0 || t === 1) return t;

	return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

// ============================================================================
// CIRCULAR EASING - Gradual then sudden
// ============================================================================

/**
 * Circular ease in - gradual then sudden acceleration
 */
export function easeInCirc(t: number): number {
	return 1 - Math.sqrt(1 - t * t);
}

/**
 * Circular ease out - sudden then gradual deceleration
 * Good for: Natural arrivals, settling effects
 */
export function easeOutCirc(t: number): number {
	const t1 = t - 1;
	return Math.sqrt(1 - t1 * t1);
}

/**
 * Circular ease in-out
 */
export function easeInOutCirc(t: number): number {
	return t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
}

// ============================================================================
// BACK EASING - Overshoots target then returns
// ============================================================================

/**
 * Back ease in - pulls back before moving forward
 * Good for: Anticipation, wind-up effects
 */
export function easeInBack(t: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;

	return c3 * t * t * t - c1 * t * t;
}

/**
 * Back ease out - overshoots then settles back
 * Good for: Bouncy UI, playful elements, attention-grabbing
 */
export function easeOutBack(t: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;

	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Back ease in-out - pulls back, moves, overshoots, settles
 */
export function easeInOutBack(t: number): number {
	const c1 = 1.70158;
	const c2 = c1 * 1.525;

	return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}

// ============================================================================
// ELASTIC EASING - Oscillating spring-like motion
// ============================================================================

/**
 * Elastic ease in - oscillates before reaching target
 * Good for: Spring effects, rubber-band pulls
 */
export function easeInElastic(t: number): number {
	const c4 = (2 * Math.PI) / 3;

	return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
}

/**
 * Elastic ease out - oscillates while settling
 * Good for: Bouncy impacts, jelly effects, playful UI
 */
export function easeOutElastic(t: number): number {
	const c4 = (2 * Math.PI) / 3;

	return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Elastic ease in-out - oscillates on both ends
 */
export function easeInOutElastic(t: number): number {
	const c5 = (2 * Math.PI) / 4.5;

	return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
}

// ============================================================================
// BOUNCE EASING - Bouncing ball effect
// ============================================================================

/**
 * Bounce ease in - bouncing before arriving (reversed bounce out)
 */
export function easeInBounce(t: number): number {
	return 1 - easeOutBounce(1 - t);
}

/**
 * Bounce ease out - bounces after impact
 * Good for: Ball drops, impact effects, playful arrivals
 */
export function easeOutBounce(t: number): number {
	const n1 = 7.5625;
	const d1 = 2.75;

	if (t < 1 / d1) {
		return n1 * t * t;
	} else if (t < 2 / d1) {
		return n1 * (t -= 1.5 / d1) * t + 0.75;
	} else if (t < 2.5 / d1) {
		return n1 * (t -= 2.25 / d1) * t + 0.9375;
	} else {
		return n1 * (t -= 2.625 / d1) * t + 0.984375;
	}
}

/**
 * Bounce ease in-out - bounces on both ends
 */
export function easeInOutBounce(t: number): number {
	return t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Applies an easing function to interpolate between two values
 */
export function ease(start: number, end: number, t: number, easingFn: (t: number) => number = easeOutQuad): number {
	const easedT = easingFn(t);
	return start + (end - start) * easedT;
}

/**
 * Smoothstep interpolation (similar to easeInOutCubic but smoother at edges)
 * Good for: Smooth value transitions, threshold effects
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}

/**
 * Smootherstep interpolation (even smoother than smoothstep)
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
	const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
	return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Custom easing with adjustable parameters
 */
export function customEase(t: number, power: number = 2, overshoot: number = 0): number {
	let result = Math.pow(t, power);

	if (overshoot > 0) {
		result += Math.sin(t * Math.PI) * overshoot;
	}

	return result;
}

/**
 * All available easing functions
 */
export const EasingFunctions = {
	linear,

	// Quadratic
	easeInQuad,
	easeOutQuad,
	easeInOutQuad,

	// Cubic
	easeInCubic,
	easeOutCubic,
	easeInOutCubic,

	// Quartic
	easeInQuart,
	easeOutQuart,
	easeInOutQuart,

	// Quintic
	easeInQuint,
	easeOutQuint,
	easeInOutQuint,

	// Sine
	easeInSine,
	easeOutSine,
	easeInOutSine,

	// Exponential
	easeInExpo,
	easeOutExpo,
	easeInOutExpo,

	// Circular
	easeInCirc,
	easeOutCirc,
	easeInOutCirc,

	// Back
	easeInBack,
	easeOutBack,
	easeInOutBack,

	// Elastic
	easeInElastic,
	easeOutElastic,
	easeInOutElastic,

	// Bounce
	easeInBounce,
	easeOutBounce,
	easeInOutBounce,

	// Utilities
	smoothstep,
	smootherstep,
	customEase,
	ease
} as const;

/**
 * Type for easing function names
 */
export type EasingFunctionName = keyof typeof EasingFunctions;

/**
 * Gets an easing function by name
 */
export function getEasingFunction(name: EasingFunctionName): (t: number) => number {
	return EasingFunctions[name] as (t: number) => number;
}
