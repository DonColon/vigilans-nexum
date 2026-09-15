import { Color } from "@/core/graphics/color/Color";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { tint } from "@/game/ui/view/NineSlice";
import { drawText } from "@/game/ui/view/UIPanel";
import { UITheme } from "@/game/ui/view/UITheme";
import { UnitFaction } from "@/game/units/components/UnitComponent";

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

/** What a banner says and how far in it is - everything `drawBanner` needs beyond the surface to draw on. */
export interface BannerContent {
	/** The small line over the title. */
	label: string;
	/** The large line. */
	title: string;
	titleColor: Color;
	/** Opacity of the whole banner, 0-1. */
	alpha: number;
	/** Horizontal offset of the text and flourishes in pixels. */
	offset: number;
}

/**
 * Draws a banner: a band across the middle of the screen, fading out towards
 * both edges, with the label in small text over the title in large, and a gold
 * flourish pointing in at the text from either side. The phase banner and the
 * battle's outcome are both drawn this way; only what they say and how their
 * clocks run differ. `divider` is the flourish art (`PhaseBannerTheme.divider`).
 */
export function drawBanner(graphics: Graphics, divider: HTMLImageElement, viewport: Dimension, content: BannerContent): void {
	if (content.alpha <= 0) {
		return;
	}

	const box = phaseBannerBox(viewport);
	const { y } = box.getPosition();

	graphics.alpha(content.alpha);
	drawBand(graphics, box);

	const labelSize = parseInt(PhaseBannerTheme.labelFont.size ?? "24", 10);
	const titleSize = parseInt(PhaseBannerTheme.titleFont.size ?? "48", 10);

	const centreX = Math.round(viewport.width / 2 + content.offset);
	const labelY = y + PhaseBannerTheme.padding + labelSize / 2;
	const titleY = y + PhaseBannerTheme.padding + labelSize + PhaseBannerTheme.lineGap + titleSize / 2;

	drawText(graphics, content.label, centreX, labelY, { font: PhaseBannerTheme.labelFont, color: PhaseBannerTheme.label, align: TextAlign.CENTER });
	drawText(graphics, content.title, centreX, titleY, { font: PhaseBannerTheme.titleFont, color: content.titleColor, align: TextAlign.CENTER });

	// The flourishes clear the wider of the two lines, whichever that is.
	const labelWidth = graphics.fontStyle(PhaseBannerTheme.labelFont).measureText(content.label).width;
	const titleWidth = graphics.fontStyle(PhaseBannerTheme.titleFont).measureText(content.title).width;
	const reach = Math.ceil(Math.max(labelWidth, titleWidth) / 2) + PhaseBannerTheme.flourishGap;

	const flourishY = Math.round(y + box.getHeight() / 2);

	drawFlourish(graphics, divider, centreX - reach - PhaseBannerTheme.flourishWidth, flourishY, false);
	drawFlourish(graphics, divider, centreX + reach, flourishY, true);

	graphics.alpha(1);
}

/** The band itself: solid in the middle, gone by either end of `box`. */
export function drawBand(graphics: Graphics, box: Rectangle): void {
	const { x } = box.getPosition();

	const gradient = graphics.createLinearGradient(x, 0, x + box.getWidth(), 0);
	gradient.addColorStop(0, PhaseBannerTheme.bandEdge.asHEX());
	gradient.addColorStop(PhaseBannerTheme.bandFade, PhaseBannerTheme.band.asHEX());
	gradient.addColorStop(1 - PhaseBannerTheme.bandFade, PhaseBannerTheme.band.asHEX());
	gradient.addColorStop(1, PhaseBannerTheme.bandEdge.asHEX());
	graphics.fillGradient(gradient).fillRectangle(box);
}

/**
 * One fading flourish, `PhaseBannerTheme.flourishWidth` wide from `x`, its
 * middle on `centreY`. The art's tip - the ring and the cross - sits at its
 * right end, so the left-hand one is drawn as it is and the right-hand one
 * mirrored, both tips pointing at the text. The tip keeps its proportions;
 * only the fading tail is stretched to make up the length.
 */
function drawFlourish(graphics: Graphics, image: HTMLImageElement, x: number, centreY: number, mirrored: boolean): void {
	const tinted = tint(image, PhaseBannerTheme.flourish);

	const scale = PhaseBannerTheme.flourishScale;
	const width = PhaseBannerTheme.flourishWidth;
	const height = Math.round(image.height * scale);
	const top = Math.round(centreY - height / 2);

	const tip = PhaseBannerTheme.flourishTip;
	const tipWidth = Math.round(tip * scale);
	const tail = image.width - tip;
	const tailWidth = width - tipWidth;

	graphics.imageSmoothing();
	graphics.save();

	if (mirrored) {
		graphics.translate(x + width, top);
		graphics.scale(-1, 1);
	} else {
		graphics.translate(x, top);
	}

	graphics.drawImage(tinted, 0, 0, tail, image.height, 0, 0, tailWidth, height);
	graphics.drawImage(tinted, tail, 0, tip, image.height, tailWidth, 0, tipWidth, height);

	graphics.restore();
}
