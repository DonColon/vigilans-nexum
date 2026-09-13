import { Color } from "@/core/graphics/color/Color";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { UITheme } from "@/game/ui/model/UITheme";
import { UnitFaction } from "@/game/units/model/UnitData";

/**
 * The phase banner's clock, layout and look, as pure functions of the banner
 * record - what `PhaseBannerSystem` advances and `PhaseBannerRenderSystem`
 * draws, so the two never disagree about how far in the sweep is.
 *
 * The shape follows the "Location discovered" notice in Kenney's Fantasy UI
 * Borders sample: a small label over a large title, a fading flourish pointing
 * in from either side, all on a translucent band that fades out at both ends.
 */

/** i18n key of the small label over the title - "Turn {turn}". */
export const PHASE_TURN_KEY = "turn.banner";

/** i18n key of the title, by faction. */
export const PHASE_TITLE_KEY: Record<UnitFaction, string> = {
	[UnitFaction.PLAYER]: "turn.playerPhase",
	[UnitFaction.ENEMY]: "turn.enemyPhase"
};

/** Milliseconds the banner takes to fade in, hold and fade out again. */
export const PHASE_BANNER_FADE_IN = 250;
export const PHASE_BANNER_HOLD = 1000;
export const PHASE_BANNER_FADE_OUT = 300;

/** How far the text and flourishes drift while fading - in from the left, out to the right. */
export const PHASE_BANNER_SLIDE = 40;

export function phaseBannerDuration(): number {
	return PHASE_BANNER_FADE_IN + PHASE_BANNER_HOLD + PHASE_BANNER_FADE_OUT;
}

/** What the banner shows at `now` milliseconds in. */
export interface PhaseBannerFrame {
	/** Opacity of the whole banner, 0-1. */
	alpha: number;
	/** Horizontal offset of the text and flourishes in pixels - negative while sliding in, positive on the way out. */
	offset: number;
	/** The fade-out has run its course. */
	done: boolean;
}

export function phaseBannerFrame(now: number): PhaseBannerFrame {
	if (now < PHASE_BANNER_FADE_IN) {
		const ratio = easeOut(now / PHASE_BANNER_FADE_IN);
		return { alpha: ratio, offset: -PHASE_BANNER_SLIDE * (1 - ratio), done: false };
	}

	const held = now - PHASE_BANNER_FADE_IN;

	if (held < PHASE_BANNER_HOLD) {
		return { alpha: 1, offset: 0, done: false };
	}

	const ratio = Math.min(1, (held - PHASE_BANNER_HOLD) / PHASE_BANNER_FADE_OUT);
	return { alpha: 1 - ratio, offset: PHASE_BANNER_SLIDE * easeIn(ratio), done: ratio >= 1 };
}

function easeOut(ratio: number): number {
	return 1 - (1 - ratio) * (1 - ratio);
}

function easeIn(ratio: number): number {
	return ratio * ratio;
}

const fontFamily = UITheme.menu.family;

export const PhaseBannerTheme = {
	/** Asset id of the fading flourish - see `asset.manifest.ts`. */
	divider: "ui-divider-fade",

	/** The small line over the title. */
	labelFont: { size: "24px", family: fontFamily, weight: "normal" } as FontStyleSettings,
	/** The phase itself, the biggest text the UI draws. Three grid steps of the pixel face, so it stays crisp. */
	titleFont: { size: "48px", family: fontFamily, weight: "normal" } as FontStyleSettings,
	label: Color.hex("#d8ceb6"),
	/** The title in the faction's own light tint, so a glance tells whose turn it is. */
	title: {
		[UnitFaction.PLAYER]: Color.hex("#cfe0ff"),
		[UnitFaction.ENEMY]: Color.hex("#ffd2cd")
	} as Record<UnitFaction, Color>,
	/** The flourishes either side, in the panel edge gold. */
	flourish: UITheme.panelEdge,

	/** The band at its darkest, in the middle; it fades to nothing at the screen's edges. */
	band: Color.hex("#0d1120e6"),
	/** The same band with its alpha gone - the outer stops of the fade. */
	bandEdge: Color.hex("#0d112000"),
	/** How much of the band's width, from either end, the fade takes. */
	bandFade: 0.25,

	/** Vertical padding of the band around the two lines. */
	padding: 20,
	/** Gap between the label's and the title's lines. */
	lineGap: 10,
	/** Gap between the text and each flourish. */
	flourishGap: 28,
	/** On-screen length of each flourish; the source is stretched along its fading tail to reach it. */
	flourishWidth: 176,
	/** How far the flourish art is scaled up - the pixel face's 48px title wants a chunkier line beside it. */
	flourishScale: 1.5,
	/**
	 * Source pixels at the flourish's tip - the ring and the cross - kept at
	 * their own proportions when the rest of the line is stretched.
	 */
	flourishTip: 32
} as const;

/** Height of the band: two lines of text and the padding around them. */
export function phaseBannerHeight(): number {
	const label = parseInt(PhaseBannerTheme.labelFont.size ?? "24", 10);
	const title = parseInt(PhaseBannerTheme.titleFont.size ?? "48", 10);

	return PhaseBannerTheme.padding * 2 + label + PhaseBannerTheme.lineGap + title;
}

/**
 * Where the band sits: the full width of the screen, vertically centred - it
 * is the one thing to look at while it is up, and it stops everything else.
 */
export function phaseBannerBox(viewport: Dimension): Rectangle {
	const height = phaseBannerHeight();

	return new Rectangle(0, Math.round((viewport.height - height) / 2), viewport.width, height);
}
