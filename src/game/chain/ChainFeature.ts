import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { ChainComponent } from "@/game/chain/components/ChainComponent";
import { ChainState } from "@/game/chain/states/ChainState";
import { ChainFlowSystem } from "@/game/chain/systems/ChainFlowSystem";
import { ChainRenderSystem } from "@/game/chain/systems/ChainRenderSystem";
import { ChainSystem } from "@/game/chain/systems/ChainSystem";

/**
 * The shield of a Special enemy and the chain attack of three units against it,
 * in the form Chapter 1 needs. A placement's `shield` on the deployment sheet
 * gives the enemy its bar. Every landed strike wears it down to its last point,
 * where the command menu offers "Chain Attack" to a unit with two allies who
 * also reach the enemy and have not attacked this turn. The first of the three
 * strikes breaks the shield.
 *
 * The feature is the wiring; [[ChainFlowSystem]] is the flow.
 */
export class ChainFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ChainComponent],
			states: [ChainState],
			systems: [
				// Event-driven: the bar, the preview and the start of a chain.
				{ system: ChainFlowSystem },
				// With the other clocks: one strike after another.
				{ system: ChainSystem, priority: 8 },
				// Above the unit tokens (18), since the bar sits over the enemy's tile.
				{ system: ChainRenderSystem, priority: 19 }
			],
			...config
		});
	}
}
