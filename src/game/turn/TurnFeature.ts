import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { PhaseBannerComponent } from "@/game/turn/components/PhaseBannerComponent";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { PhaseBannerRenderSystem } from "@/game/turn/systems/PhaseBannerRenderSystem";
import { PhaseBannerSystem } from "@/game/turn/systems/PhaseBannerSystem";
import { TurnFlowSystem } from "@/game/turn/systems/TurnFlowSystem";
import { TurnRenderSystem } from "@/game/turn/systems/TurnRenderSystem";
import { TurnSystem } from "@/game/turn/systems/TurnSystem";

/**
 * The battle turn counter and its phases. It owns the `TurnComponent` - the
 * turn number and whose phase it is - shows the number in the map's top-left
 * corner (`TurnRenderSystem`) and ends a phase: on `turn:end` from the global
 * command menu (or from the enemy phase, once it has nobody left to move), or
 * on its own once every unit of the acting side has acted (`unit:acted`). The
 * end is only marked ([[TurnFlowSystem]]); [[TurnSystem]] completes it once
 * nothing is left over the map - the last action's experience bar or popup
 * seen off - turning the counter over to the next side and waking every unit
 * back up. The player's phase and the enemy's alternate; the number bumps when
 * the player's comes round again. What the enemy does with its phase is the AI
 * feature's - see src/game/ai.
 *
 * Every new phase - the first one included - opens with the phase banner
 * ("Player Phase" / "Enemy Phase") sweeping across the screen: a
 * [[PhaseBannerState]] pushed over the map, which freezes it until the banner
 * has faded on its own.
 */
export class TurnFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [TurnComponent, PhaseBannerComponent],
			states: [PhaseBannerState],
			systems: [
				// Event-driven: opens and marks the turns. Order among the update systems does not matter.
				{ system: TurnFlowSystem, priority: 7 },
				// Both run before the sync phase, like the fight animation's clock.
				{ system: TurnSystem, priority: 8 },
				{ system: PhaseBannerSystem, priority: 8 },
				// Above UIRenderSystem (50) on the "ui" layer, so the counter sits over
				// any open menu - and the banner over everything.
				{ system: TurnRenderSystem, priority: 55 },
				{ system: PhaseBannerRenderSystem, priority: 58 }
			],
			...config
		});
	}
}
