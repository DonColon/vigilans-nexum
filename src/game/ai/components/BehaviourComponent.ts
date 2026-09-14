import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { EnemyBehaviour } from "@/game/ai/content/Behaviours";

export interface BehaviourData extends JsonSchema {
	/** How this unit spends the enemy phase - see `content/Behaviours`. */
	behaviour: EnemyBehaviour;
}

/**
 * How an enemy unit fights, on the unit's own entity next to its sheet: what
 * the deployment placement asked for, or the default for a unit like it.
 * `EnemyFlowSystem` tags every enemy with one when the map opens; a unit
 * without one charges.
 */
export class BehaviourComponent extends Component<BehaviourData> {
	public static readonly type = "behaviour";
}
