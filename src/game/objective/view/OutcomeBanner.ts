import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Outcome } from "@/game/objective/components/ObjectiveComponent";
import { PHASE_BANNER_FADE_IN, phaseBannerBox, phaseBannerFrame, PhaseBannerFrame, PhaseBannerTheme } from "@/game/turn/view/PhaseBanner";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * The outcome banner's clock and look. It is the phase banner's shape - the
 * same band, the same flourishes, `drawBanner` draws both - sweeping in the
 * same way, but it never fades out: it holds until the player presses, and
 * only takes the press once it has been up long enough to be read.
 */

/** i18n key of the title, by outcome. */
export const OUTCOME_TITLE_KEY: Record<Outcome, string> = {
	[Outcome.VICTORY]: "objective.victory",
	[Outcome.DEFEAT]: "objective.defeat"
};

/** i18n key of the line under the band, once the banner holds - what a press does. */
export const OUTCOME_CONTINUE_KEY = "objective.continue";

/** Milliseconds the banner has to be up before a press is taken - a mashed confirm from the fight does not skip it. */
export const OUTCOME_HOLD_MS = 1200;

/** What the banner shows at `now` milliseconds in: the phase banner's sweep in, then held. */
export function outcomeBannerFrame(now: number): PhaseBannerFrame {
	if (now < PHASE_BANNER_FADE_IN) {
		return phaseBannerFrame(now);
	}

	return { alpha: 1, offset: 0, done: false };
}

/** Whether a press at `now` milliseconds in is taken. */
export function outcomeAcceptsPress(now: number): boolean {
	return now >= OUTCOME_HOLD_MS;
}

export const OutcomeBannerTheme = {
	/** The title in the colour of the news: gold for the day won, the enemy's red for the day lost. */
	title: {
		[Outcome.VICTORY]: UITheme.panelEdge,
		[Outcome.DEFEAT]: PhaseBannerTheme.title.enemy
	} as Record<Outcome, Color>,
	/** The line under the band, on a narrower band of its own so it reads over the map. */
	continueFont: PhaseBannerTheme.labelFont,
	continueColor: PhaseBannerTheme.label,
	/** Gap between the main band's bottom edge and the line's band. */
	continueGap: 12,
	/** Vertical padding of the line's band around the text. */
	continuePadding: 10,
	/** How much of the screen's width the line's band takes - narrower than the main one. */
	continueWidth: 0.5
} as const;

/** Where the line under the band sits: a narrower band, centred, just below the main one. */
export function outcomeContinueBox(viewport: Dimension): Rectangle {
	const main = phaseBannerBox(viewport);
	const height = OutcomeBannerTheme.continuePadding * 2 + parseInt(OutcomeBannerTheme.continueFont.size ?? "24", 10);
	const width = Math.round(viewport.width * OutcomeBannerTheme.continueWidth);

	return new Rectangle(Math.round((viewport.width - width) / 2), main.getPosition().y + main.getHeight() + OutcomeBannerTheme.continueGap, width, height);
}
