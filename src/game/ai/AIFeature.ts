import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { BehaviourComponent } from "@/game/ai/components/BehaviourComponent";
import { EnemyActionComponent } from "@/game/ai/components/EnemyActionComponent";
import { EnemyPhaseState } from "@/game/ai/states/EnemyPhaseState";
import { EnemyFlowSystem } from "@/game/ai/systems/EnemyFlowSystem";
import { EnemyPhaseSystem } from "@/game/ai/systems/EnemyPhaseSystem";

/**
 * The enemy phase: what the other side does with its turn. Once the turn
 * feature has handed the phase to the enemy and its banner has gone, the map
 * is held under an [[EnemyPhaseState]] and the enemy's units act one after
 * another - each walks (or holds its ground, by its deployment `behaviour`)
 * and strikes at the best target it can reach, through the very same walk and
 * fight the player's units use, so the animation, the experience and the
 * deaths all come from where they always did. When the last one is spent the
 * phase ends and the turn comes back to the player.
 *
 * The choosing is `rules/EnemyPlan`, built on the movement, targeting and
 * forecast rules the player sees: an enemy never does anything the range
 * overlay did not warn of. [[EnemyFlowSystem]] tags the units and hears the
 * fights resolve; [[EnemyPhaseSystem]] runs the phase on the frame clock.
 */
export class AIFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [BehaviourComponent, EnemyActionComponent],
			states: [EnemyPhaseState],
			systems: [
				// Event-driven: tags the enemies and hears their fights resolve. Order among the update systems does not matter.
				{ system: EnemyFlowSystem, priority: 7 },
				// Runs before the sync phase, beside the turn's and the fight's clocks.
				{ system: EnemyPhaseSystem, priority: 8 }
			],
			...config
		});
	}
}
