import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { rosterCommands } from "@/game/roster/commands/RosterCommands";
import { RosterComponent } from "@/game/roster/components/RosterComponent";
import { RosterState } from "@/game/roster/states/RosterState";
import { RosterRenderSystem } from "@/game/roster/systems/RosterRenderSystem";
import { RosterSystem } from "@/game/roster/systems/RosterSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Fire Emblem's "Units" screen: the army list, opened from the map's own
 * command menu, showing every unit of your own with the numbers on its sheet
 * side by side.
 *
 *  - `roster:requested` (the "Units" row of the global menu) opens a
 *    [[RosterState]] over the map, which freezes it the way a menu does.
 *  - Up and down move the highlight; confirm or cancel closes it and reports
 *    `roster:closed`. Nothing about the army changes - it is a readout, so there
 *    is nothing on it to confirm.
 *  - Only the player's own units are listed. What the other side is carrying is
 *    not something the list is for; the enemy-range overlay is.
 */
export class RosterFeature extends GameFeature {
	/** Row the list was last left on, so re-opening it comes back to the same unit. */
	private lastIndex = 0;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [RosterComponent],
			states: [RosterState],
			commands: [...rosterCommands],
			systems: [
				// Alongside MenuSystem / TradeSystem in the update phase.
				{ system: RosterSystem, priority: 10 },
				// Above the corner HUDs (54, 55): a full list covers them while it is up.
				{ system: RosterRenderSystem, priority: 56 }
			],
			...config
		});
	}

	protected onInstall(): void {
		this.subscribe("roster:requested", () => this.open());
		this.subscribe("roster:closed", (event) => (this.lastIndex = Math.max(0, event.selectedIndex)));
		this.subscribe("map:closed", () => (this.lastIndex = 0));
	}

	/** Opens the list on every player unit currently on the map. */
	private open(): void {
		const unitIds = UnitSystem.ofFaction(UnitSystem.inWorld(this.world), UnitFaction.PLAYER).map((unit) => unit.getComponent(UnitComponent).read().id);

		this.stateManager.getState(RosterState).request({ unitIds, selectedIndex: this.lastIndex });
		this.stateManager.push(RosterState);
	}
}
