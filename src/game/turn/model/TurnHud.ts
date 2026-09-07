import { Color } from "@/core/graphics/color/Color";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";

/** The `kenney-1bit` tilesheet the turn counter is drawn from. */
export const TURN_SHEET = "kenney-1bit";

/** Frame of the digit `0`; `1`..`9` follow in order (see `docs/kenney-1bit-index.png`). */
export const DIGIT_ZERO = 868;

/** i18n key for the word before the count - "Turn" / "Zug". */
export const TURN_LABEL_KEY = "turn.label";

// The `kenney-mini` pixel font (loaded with the tilesheet, see asset.manifest.ts)
// is crisp at multiples of 8px; the fallback covers the frame or two before the
// font asset lands. `labelCapRatio` is its cap height over its em (640/1024),
// used to sit the label on the digits' optical centre.
const LABEL_FAMILY = "'kenney-mini', 'Trebuchet MS', sans-serif";

/**
 * The turn counter tucked into the map's top-left corner: a localized label
 * ("Turn" / "Zug") followed by a couple of `kenney-1bit` digit tiles on a dark
 * plate. Always at least two digits, so turn 3 reads `03`.
 */
export const TurnHud = {
	sheet: TURN_SHEET,
	/** Source tile size of the digit glyphs. */
	glyph: 16,
	/** How far the digit tiles are scaled up. */
	scale: 1.5,
	/** Gap between the plate and the map's top-left corner. */
	inset: 6,
	/** Inner padding of the plate around the digits. */
	padding: 4,
	/** Extra pixels trimmed between digits - the glyphs carry their own side margin. */
	kerning: 4,
	/** Gap between the label and the first digit. */
	labelGap: 6,
	labelKey: TURN_LABEL_KEY,
	labelFont: { size: "16px", family: LABEL_FAMILY, weight: "normal" } as FontStyleSettings,
	labelCapRatio: 0.625,
	/** Matches the baked colour of the `kenney-1bit` digit glyphs so label and count read as one. */
	label: Color.hex("#cfc6b8"),
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
