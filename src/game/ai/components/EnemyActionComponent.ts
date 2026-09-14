import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";

/**
 * Where an enemy is in its action. Each step is left when what it waits for
 * is over: a pause has run, the walk has landed, the fight has resolved.
 */
export type EnemyActionStep = (typeof EnemyActionStep)[keyof typeof EnemyActionStep];

export const EnemyActionStep = {
	/** The cursor has just landed on the unit; a beat before it moves, so the eye can find it. */
	FOCUS: "focus",
	/** The token is walking its route. */
	WALK: "walk",
	/** It has arrived; a beat before it swings. */
	AIM: "aim",
	/** The fight was handed to the combat feature and has not resolved yet. */
	FIGHT: "fight",
	/** Everything the unit was going to do is done - it is spent next. */
	DONE: "done"
} as const;

export interface EnemyActionData extends JsonSchema {
	step: EnemyActionStep;
	/** Milliseconds into the current step - only the pauses read it. */
	elapsed: number;
	/** The route it walks, start and destination included; a single tile when it stays put. */
	path: GridPositionData[];
	/** Id of the unit it strikes at from the destination, or "" when it has nobody in reach. */
	targetId: string;
	/** Id of the weapon it strikes with - one of its pack entries, readied when the fight is handed over. */
	weaponId: string;
}

/**
 * The enemy unit that is acting right now, on the unit's own entity: the plan
 * `rules/EnemyPlan` made for it and how far along it is. One at a time - the
 * enemy phase moves its units one after another, the way Fire Emblem's does -
 * and it comes off again when the unit is spent, or with the unit when a
 * counter-attack fells it mid-action.
 */
export class EnemyActionComponent extends Component<EnemyActionData> {
	public static readonly type = "enemyAction";

	/** The action at its first step, from a plan. */
	public static begin(path: GridPositionData[], targetId: string, weaponId: string): EnemyActionData {
		return { step: EnemyActionStep.FOCUS, elapsed: 0, path, targetId, weaponId };
	}

	/** The same action moved on to `step`, its clock reset. */
	public static advance(action: EnemyActionData, step: EnemyActionStep): EnemyActionData {
		return { ...action, step, elapsed: 0 };
	}
}
