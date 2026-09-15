import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { ThreatComponent } from "@/game/threat/components/ThreatComponent";
import { ThreatRenderSystem } from "@/game/threat/systems/ThreatRenderSystem";
import { ThreatFlowSystem } from "@/game/threat/systems/ThreatFlowSystem";

/**
 * Radiant Dawn's enemy range, in two shapes:
 *
 *  - Confirm on an enemy lights that one up - crimson over the tiles it can
 *    walk onto, amber over what that puts in reach. Confirm on the same enemy
 *    again, or cancel, puts it away. It is a look, not a selection: nothing is
 *    picked up, nothing is spent and the enemy stays exactly where it is.
 *  - The enemy-range button (`map:threatToggled`, R / RB) does the same for the
 *    whole enemy army at once and leaves it up, so the danger zone can be read
 *    while your own units are moved around inside it.
 *
 * The button wins over the single look: pressing it while one enemy is showing
 * widens the overlay to all of them, and pressing it again drops the lot.
 *
 * What is drawn is worked out from where the units stand *now*, so it is
 * recomputed whenever that could have changed - somebody moved, somebody died,
 * a turn ended - rather than every frame.
 *
 * It handles `map:tileConfirmed` at priority 20, above the move flow (10), and
 * stops the event once it has consumed a press; while one of your own units is
 * picked up it keeps its hands off and lets the move flow have it.
 *
 * The feature is the wiring; [[ThreatFlowSystem]] is the flow.
 */
export class ThreatFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ThreatComponent],
			// Between the terrain art (14) and the move overlay (16): a picked-up
			// unit's blue range reads on top of the enemy wash, units on top of both.
			systems: [
				// Event-driven: the feature's flow.
				{ system: ThreatFlowSystem },
				{ system: ThreatRenderSystem, priority: 15 }
			],
			...config
		});
	}
}
