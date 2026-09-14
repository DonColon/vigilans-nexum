import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
import { UnitDeploySystem } from "@/game/units/systems/UnitDeploySystem";
import { UnitPopSystem } from "@/game/units/systems/UnitPopSystem";
import { UnitRenderSystem } from "@/game/units/systems/UnitRenderSystem";

/**
 * Puts the playable units on the battle map. It only owns the units themselves -
 * their sheets, tokens and where they stand. Picking one up and moving it is the
 * [[MovementFeature]]'s job, wired to the same `map:*` events.
 *
 * The feature is the wiring: [[UnitDeploySystem]] deploys and withdraws the
 * units on `map:ready` / `map:closed`, [[UnitRenderSystem]] draws them and
 * [[UnitPopSystem]] runs the floating labels' clock.
 */
export class UnitsFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [UnitComponent, CommanderComponent, UnitPopComponent],
			systems: [
				// Event-driven: deploys and withdraws the units. Order among the update systems does not matter.
				{ system: UnitDeploySystem, priority: 7 },
				// Runs the floating-label clock; order among the update systems does not matter.
				{ system: UnitPopSystem, priority: 8 },
				// On the "background" layer above the tileset art and the move overlay,
				// below the cursor's own layer - see UnitRenderSystem.
				{ system: UnitRenderSystem, priority: 17 }
			],
			...config
		});
	}
}
