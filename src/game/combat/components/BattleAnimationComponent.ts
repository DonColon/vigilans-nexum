import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { BattleAnimationStep } from "@/game/combat/model/BattleAnimation";

export interface BattleAnimationData extends JsonSchema {
	attackerId: string;
	defenderId: string;
	/** Tiles the two combatants stand on, for the lunge direction. */
	attackerColumn: number;
	attackerRow: number;
	defenderColumn: number;
	defenderRow: number;
	/** HP each unit went into the fight with. */
	startAttackerHp: number;
	startDefenderHp: number;
	/** Per-swing snapshots, from `battleAnimationSteps`. */
	steps: BattleAnimationStep[];
	elapsed: number;
	/** Who is to be taken off the map once the animation lands. */
	attackerDefeated: boolean;
	defenderDefeated: boolean;
}

/**
 * The running battle animation - one at a time, on its own entity, created by
 * [[BattleAnimationState]]. `BattleAnimationSystem` advances `elapsed`, writes
 * the per-token [[CombatAnimationComponent]]s, and finalises the fight (deaths,
 * `combat:resolved`) when it lands.
 */
export class BattleAnimationComponent extends Component<BattleAnimationData> {
	public static readonly type = "battleAnimation";
}
