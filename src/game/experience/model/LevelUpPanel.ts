import { Color } from "@/core/graphics/color/Color";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { ExperienceData } from "@/game/experience/components/ExperienceComponent";
import { UITheme } from "@/game/ui/model/UITheme";
import { STAT_NAMES, StatName } from "@/game/units/model/UnitData";

/**
 * The level-up panel's clock and layout - Fire Emblem's: the banner comes up
 * and the level rolls over, then every stat that rose lights up one after
 * another with its gain popping in beside it, until the whole level is on show
 * and a press takes it down. Pure functions of the display record, so
 * `ExperienceSystem` (the clock), the confirm command (the skip) and
 * `ExperienceRenderSystem` (the drawing) all read the same timeline.
 */

/** Milliseconds the banner has to itself before the first stat lights up; the level rolls over halfway through. */
export const LEVEL_UP_BANNER = 700;
/** Milliseconds between one stat lighting up and the next. */
export const LEVEL_UP_STAT_STEP = 260;
/** How long a freshly lit gain is drawn popped - big - before it settles. */
export const LEVEL_UP_POP = 200;
/** A beat after the last stat before the panel counts as complete and a press takes it down. */
export const LEVEL_UP_SETTLE = 300;

/** The gains, in the green the unit sheet paints HP with - "more of you". */
export const LEVEL_UP_GAIN = Color.hex("#7fe3a0");
/** The stats laid out in two columns of five: the sheet's order, read down then across. */
export const LEVEL_UP_COLUMNS = 2;
export const LEVEL_UP_ROWS = STAT_NAMES.length / LEVEL_UP_COLUMNS;

/** Gap the panel keeps from the sides of a narrow screen. */
const SCREEN_MARGIN = 36;
/** Width of the panel: two stat columns with room for a label, a number and a gain each. */
const LEVEL_UP_WIDTH = 600;

/** The stats that rose on this level, in sheet order - the order they light up in. */
export function raisedStats(data: ExperienceData): StatName[] {
	return STAT_NAMES.filter((stat) => data.gains[stat] > 0);
}

/** How long the whole panel takes to play out by itself. */
export function levelUpDuration(data: ExperienceData): number {
	return LEVEL_UP_BANNER + raisedStats(data).length * LEVEL_UP_STAT_STEP + LEVEL_UP_SETTLE;
}

/** One stat on the panel at a moment in the timeline. */
export interface LevelUpStat {
	stat: StatName;
	/** The number to show: the old value until the stat lights up, the new one after. */
	value: number;
	/** What it rose by - 0 for a stat that did not. */
	gain: number;
	/** The gain is on show. */
	revealed: boolean;
	/** The gain is still popped - freshly lit, drawn big. */
	popping: boolean;
}

export interface LevelUpFrame {
	/** The level on the banner: the old one until it rolls over, the new one after. */
	level: number;
	/** The banner has finished coming up and the stats are lighting. */
	bannerDone: boolean;
	stats: LevelUpStat[];
	/** Everything is on show - the next press takes the panel down. */
	complete: boolean;
}

export function levelUpFrame(data: ExperienceData, now: number): LevelUpFrame {
	const raised = raisedStats(data);

	const stats = STAT_NAMES.map((stat): LevelUpStat => {
		const gain = data.gains[stat];
		const order = raised.indexOf(stat);
		const lightsAt = LEVEL_UP_BANNER + order * LEVEL_UP_STAT_STEP;
		const revealed = order >= 0 && now >= lightsAt;

		return {
			stat,
			value: data.statsBefore[stat] + (revealed ? gain : 0),
			gain,
			revealed,
			popping: revealed && now < lightsAt + LEVEL_UP_POP
		};
	});

	return {
		level: now >= LEVEL_UP_BANNER / 2 ? data.toLevel : data.fromLevel,
		bannerDone: now >= LEVEL_UP_BANNER,
		stats,
		complete: now >= levelUpDuration(data)
	};
}

/** Height the panel needs: its padding, the banner line, the stat rows and the hint under them. */
export function levelUpHeight(): number {
	return UITheme.padding * 2 + UITheme.lineHeight + LEVEL_UP_ROWS * UITheme.lineHeight + UITheme.lineHeight;
}

/** Where the panel sits: dead centre, where the bar it follows was. */
export function levelUpBox(viewport: Dimension): Rectangle {
	const width = Math.min(LEVEL_UP_WIDTH, viewport.width - 2 * SCREEN_MARGIN);
	const height = levelUpHeight();

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}
