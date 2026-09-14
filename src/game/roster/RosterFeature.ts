import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { rosterCommands } from "@/game/roster/commands/RosterCommands";
import { RosterComponent } from "@/game/roster/components/RosterComponent";
import { RosterState } from "@/game/roster/states/RosterState";
import { RosterFlowSystem } from "@/game/roster/systems/RosterFlowSystem";
import { RosterRenderSystem } from "@/game/roster/systems/RosterRenderSystem";
import { RosterSystem } from "@/game/roster/systems/RosterSystem";

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
 *
 * The feature is the wiring; [[RosterFlowSystem]] opens the list,
 * [[RosterSystem]] drives it while it is up.
 */
export class RosterFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [RosterComponent],
			states: [RosterState],
			commands: [...rosterCommands],
			systems: [
				// Event-driven: opens the list. Order among the update systems does not matter.
				{ system: RosterFlowSystem, priority: 9 },
				// Alongside MenuSystem / TradeSystem in the update phase.
				{ system: RosterSystem, priority: 10 },
				// Above the corner HUDs (54, 55): a full list covers them while it is up.
				{ system: RosterRenderSystem, priority: 56 }
			],
			...config
		});
	}
}
