import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { StatBoost } from "@/game/units/model/UnitData";

/** Where the experience display is: the bar filling, or the level-up panel playing out. */
export type ExperiencePhase = (typeof ExperiencePhase)[keyof typeof ExperiencePhase];

export const ExperiencePhase = {
	FILLING: "filling",
	LEVEL_UP: "level-up"
} as const;

export interface ExperienceData extends JsonSchema {
	unitId: string;
	/** The unit's name, so the display can be labelled once the unit has left the map. */
	name: string;
	/** Level and points before the gain - where the bar starts. */
	fromLevel: number;
	fromExperience: number;
	/** Points actually added. The bar fills by this much, wrapping at 100 when a level was reached. */
	gained: number;
	/** The level reached, or 0 when the gain did not reach one. */
	toLevel: number;
	/** Every stat as it stood before the level - what the level-up panel counts up from. */
	statsBefore: StatBoost;
	/** What each stat rose by on the level - all zero when there was none. */
	gains: StatBoost;
	/** Milliseconds the current phase has been up - the clock starts over when the level-up panel takes over. */
	elapsed: number;
	phase: ExperiencePhase;
	/** The player has acknowledged the level-up panel - it is to come down. */
	closed: boolean;
}

/**
 * The experience display in progress - Fire Emblem's bar filling after a fight
 * or a heal, then the level-up panel when it wraps: the level rolling over and
 * each stat that rose lighting up in turn. One at a time, on its own entity,
 * created by [[ExperienceState]]; `ExperienceSystem` runs the clock and
 * `ExperienceRenderSystem` draws it. The points are already on the unit -
 * this only delays the *showing*.
 */
export class ExperienceComponent extends Component<ExperienceData> {
	public static readonly type = "experience";
}
