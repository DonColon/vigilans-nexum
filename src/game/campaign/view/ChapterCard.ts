import { Color } from "@/core/graphics/color/Color";
import { PhaseBannerTheme } from "@/game/turn/view/PhaseBanner";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * The chapter card's clock and look: the chapter's number in small text over
 * its title in large, on a dark screen, faded in and then held until the
 * player presses - and, like the outcome banner, only taking the press once it
 * has been up long enough to be read.
 */

/** i18n key of the small line, with the chapter's number. */
export const CHAPTER_LABEL_KEY = "campaign.chapter";

/** i18n key of the line under the title, once the card takes a press. */
export const CHAPTER_BEGIN_KEY = "campaign.begin";

/** Milliseconds the card takes to fade in. */
export const CHAPTER_FADE_IN = 400;

/** Milliseconds the card has to be up before a press is taken - the press that ended the last battle does not skip it. */
export const CHAPTER_HOLD_MS = 1200;

/** How far in the card is at `now` milliseconds: 0 (black) to 1 (fully shown). */
export function chapterCardAlpha(now: number): number {
	return Math.min(1, Math.max(0, now / CHAPTER_FADE_IN));
}

/** Whether a press at `now` milliseconds in is taken. */
export function chapterCardAcceptsPress(now: number): boolean {
	return now >= CHAPTER_HOLD_MS;
}

export const ChapterCardTheme = {
	background: Color.hex("#0d1120"),
	labelFont: PhaseBannerTheme.labelFont,
	label: PhaseBannerTheme.label,
	titleFont: PhaseBannerTheme.titleFont,
	title: UITheme.panelEdge,
	beginFont: PhaseBannerTheme.labelFont,
	begin: UITheme.hint,
	/** Where the title's centre line sits, as a share of the screen's height. */
	titleY: 0.45,
	/** Gap between the label's centre line and the title's. */
	labelGap: 56,
	/** Gap between the title's centre line and the line under it. */
	beginGap: 96
} as const;
