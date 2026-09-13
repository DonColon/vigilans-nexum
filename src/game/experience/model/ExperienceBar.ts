import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { ExperienceData } from "@/game/experience/components/ExperienceComponent";
import { POPUP_WIDTH } from "@/game/ui/model/UILayout";
import { UITheme } from "@/game/ui/model/UITheme";
import { LEVEL_UP_EXPERIENCE } from "@/game/units/model/UnitData";

/**
 * The experience bar's clock and layout, as pure functions of the display
 * record - what `ExperienceSystem` advances and `ExperienceRenderSystem` draws,
 * so the two never disagree about where the fill has got to.
 */

/** Milliseconds the fill spends on each point, so a full bar takes a little over a second. */
export const EXPERIENCE_POINT_DURATION = 12;
/** How long the finished bar stays up before it goes, when there is no level to show. */
export const EXPERIENCE_HOLD = 600;

/** The empty track behind the fill. */
export const EXPERIENCE_TRACK = Color.hex("#2b3345");
/** The fill - the UI's gold, the same the hover card's EXP bar fills in. */
export const EXPERIENCE_FILL = Color.hex("#c8a86e");
export const EXPERIENCE_BAR_HEIGHT = 10;

/** Gap the bar keeps from the bottom of the screen. */
const SCREEN_MARGIN = 36;
/** Room for the "EXP" label on the left and the number on the right. */
export const EXPERIENCE_LABEL_WIDTH = 72;
export const EXPERIENCE_VALUE_WIDTH = 56;

/** How long the bar takes to fill: every point, then the hold. */
export function experienceFillDuration(data: ExperienceData): number {
	return data.gained * EXPERIENCE_POINT_DURATION;
}

export function experienceDuration(data: ExperienceData): number {
	return experienceFillDuration(data) + EXPERIENCE_HOLD;
}

/** What the bar shows at `now` milliseconds in. */
export interface ExperienceFrame {
	/** The level the bar is filling for - the new one once the fill has wrapped. */
	level: number;
	/** Points the bar shows for that level, 0-99. */
	experience: number;
	/** How full the bar is, 0-1. */
	ratio: number;
	/** Every point has been counted in. */
	filled: boolean;
	/** The hold after the fill has run out too. */
	done: boolean;
}

export function experienceFrame(data: ExperienceData, now: number): ExperienceFrame {
	const counted = Math.min(data.gained, Math.floor(now / EXPERIENCE_POINT_DURATION));
	const total = data.fromExperience + counted;
	const wrapped = data.toLevel > 0 && total >= LEVEL_UP_EXPERIENCE;
	// A capped unit's bar stops at 99 rather than wrapping into a level it cannot take.
	const experience = wrapped ? total - LEVEL_UP_EXPERIENCE : Math.min(LEVEL_UP_EXPERIENCE - 1, total);

	return {
		level: wrapped ? data.toLevel : data.fromLevel,
		experience,
		ratio: experience / LEVEL_UP_EXPERIENCE,
		filled: counted >= data.gained,
		done: now >= experienceDuration(data)
	};
}

/**
 * Where the bar sits: a short panel dead centre of the screen, where every
 * other notice goes - it is the one thing on screen to watch while it fills,
 * and the level-up notice then lands right over it.
 */
export function experienceBox(viewport: Dimension): Rectangle {
	const width = Math.min(POPUP_WIDTH, viewport.width - 2 * SCREEN_MARGIN);
	const height = UITheme.padding * 2 + UITheme.lineHeight;

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}
