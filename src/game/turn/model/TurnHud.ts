import { Color } from "@/core/graphics/color/Color";

/** The `kenney-1bit` tilesheet the turn counter is drawn from. */
export const TURN_SHEET = "kenney-1bit";

/** Frame of the digit `0`; `1`..`9` follow in order (see `docs/kenney-1bit-index.png`). */
export const DIGIT_ZERO = 868;

/**
 * The turn counter in the top-left corner: a couple of `kenney-1bit` digit
 * tiles on a dark plate. Always at least two digits, so turn 3 reads `03`.
 */
export const TurnHud = {
	sheet: TURN_SHEET,
	/** Source tile size of the digit glyphs. */
	glyph: 16,
	/** How far the digit tiles are scaled up. */
	scale: 2,
	/** Gap between the counter and the top-left corner. */
	margin: 8,
	/** Inner padding of the plate around the digits. */
	padding: 5,
	/** Extra pixels trimmed between digits - the glyphs carry their own side margin. */
	kerning: 4,
	plate: Color.hex("#141a26cc")
} as const;

/**
 * The digit frames for a turn number, always padded to at least two digits.
 * `turnDigits(3)` -> `[868, 871]` ("03").
 */
export function turnDigits(turn: number): number[] {
	return String(Math.max(0, Math.floor(turn)))
		.padStart(2, "0")
		.split("")
		.map((digit) => DIGIT_ZERO + Number(digit));
}
