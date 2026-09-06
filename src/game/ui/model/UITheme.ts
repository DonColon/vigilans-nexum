import { Color } from "@/core/graphics/color/Color";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";

/**
 * The UI font. Both entries are Kenney pixel fonts loaded as assets (see
 * `asset.manifest.ts`); swap `FONT` to the other to try it. A pixel font is only
 * crisp at font sizes that land on its own design grid - `size` divided by the
 * font's grid divisor has to be a whole number of pixels - and only when drawn
 * at integer coordinates, which the renderer does. `weight` stays "normal"
 * throughout: these fonts ship one weight and a faked bold turns to mush.
 */
const FONT_PRESETS = {
	// 1024 em on a 128-unit grid -> crisp at multiples of 8. Tall, the more legible
	// of the two. `capRatio` is the font's cap height over its em (640/1024), used
	// to sit a line of text on its optical centre rather than the em-box centre.
	mini: { family: "kenney-mini", body: "24px", name: "16px", menu: "24px", lineHeight: 30, padding: 24, capRatio: 0.625 },
	// 1024 em on a 64-unit grid -> crisp at multiples of 16. Short, blocky, chunkier
	// retro look. Speaker name shares the body size (16px would be a squint); the
	// gold colour carries the hierarchy instead. capRatio 448/1024.
	pixel: { family: "kenney-pixel", body: "32px", name: "32px", menu: "32px", lineHeight: 34, padding: 24, capRatio: 0.4375 }
} as const;

const FONT = FONT_PRESETS.pixel;

const fontFamily = `'${FONT.family}', 'Trebuchet MS', sans-serif`;

/**
 * Look of every textbox and menu the UI feature draws. The Kenney "Fantasy UI
 * Borders" art is a 1-bit alpha mask (white on transparency); the renderer tints
 * it to these colours at draw time, so the palette lives here rather than in the
 * PNGs.
 */
export const UITheme = {
	/** Asset ids the panels are nine-sliced from - see `asset.manifest.ts`. */
	assets: {
		panel: "ui-panel",
		frame: "ui-frame",
		divider: "ui-divider"
	},

	/**
	 * How far the corner of each source PNG reaches before the edge becomes a
	 * stretchable band. The panel and frame art is 48x48 with the ornament inside
	 * the outer 16px, so a third of the image slices cleanly.
	 */
	nineSlice: {
		source: 48,
		corner: 16
	},

	/** Filled body of a panel, drawn from `panel`. Kept a touch translucent so the map still reads behind it. */
	panelFill: Color.hex("#1b2138f2"),
	/** Ornate ring drawn from `frame` over the body. */
	panelEdge: Color.hex("#c8a86e"),
	/** Thin inner keyline that sharpens the reading edge of the text area. */
	panelInline: Color.hex("#00000055"),

	/** Body text once a word has been revealed. */
	text: Color.hex("#f3ecd9"),
	/** Text not revealed yet - laid out but drawn at this near-zero alpha so the box never resizes. */
	textHidden: Color.hex("#f3ecd903"),
	/** Speaker name above the body. */
	speaker: Color.hex("#ffe07a"),
	/** "press to continue" chevron. */
	hint: Color.hex("#c8a86ecc"),

	/** Faint fill washed across the highlighted menu row, behind the text and inside the brackets. */
	menuSelectionFill: Color.hex("#ffe07a14"),
	/**
	 * The selected menu row is framed by four corner brackets, the same shape the
	 * map cursor uses (CursorRenderSystem) but static - no pulse. Drawn twice, a
	 * dark wider pass under a gold one, so it reads against the panel.
	 */
	menuCursor: Color.hex("#ffe27a"),
	menuCursorOutline: Color.hex("#3a2a06"),
	menuCursorWidth: 3,
	/** Bracket arm length as a fraction of the row's short side. */
	menuCursorBracket: 0.2,
	/** Menu row that is not highlighted. */
	menuItem: Color.hex("#d8ceb6"),
	menuItemSelected: Color.hex("#fff6dd"),
	menuTitle: Color.hex("#ffe07a"),

	// Derived from the FONT preset above; the fallback family covers the frame or
	// two before the font asset lands.
	body: { size: FONT.body, family: fontFamily, weight: "normal" } as FontStyleSettings,
	name: { size: FONT.name, family: fontFamily, weight: "normal" } as FontStyleSettings,
	menu: { size: FONT.menu, family: fontFamily, weight: "normal" } as FontStyleSettings,

	/** Inner margin between the panel edge and its content. */
	padding: FONT.padding,
	/** Baseline-to-baseline distance of body text. */
	lineHeight: FONT.lineHeight,
	/** Cap height over em for the active font - see the FONT presets. */
	capRatio: FONT.capRatio,
	/** Milliseconds between two words becoming visible while a page reveals itself. */
	wordRevealDelay: 45
} as const;
