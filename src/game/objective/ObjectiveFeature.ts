import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { objectiveScreenCommands } from "@/game/objective/commands/ObjectiveScreenCommands";
import { outcomeCommands } from "@/game/objective/commands/OutcomeCommands";
import { ObjectiveComponent } from "@/game/objective/components/ObjectiveComponent";
import { ObjectiveScreenComponent } from "@/game/objective/components/ObjectiveScreenComponent";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
import { ObjectiveScreenState } from "@/game/objective/states/ObjectiveScreenState";
import { OutcomeState } from "@/game/objective/states/OutcomeState";
import { ObjectiveFlowSystem } from "@/game/objective/systems/ObjectiveFlowSystem";
import { ObjectiveScreenRenderSystem } from "@/game/objective/systems/ObjectiveScreenRenderSystem";
import { ObjectiveScreenSystem } from "@/game/objective/systems/ObjectiveScreenSystem";
import { ObjectiveSystem } from "@/game/objective/systems/ObjectiveSystem";
import { OutcomeRenderSystem } from "@/game/objective/systems/OutcomeRenderSystem";
import { SeizeMarkerRenderSystem } from "@/game/objective/systems/SeizeMarkerRenderSystem";

/**
 * What the battle is for, and when it is over. The deployment sheet names the
 * objective - rout every enemy, or seize a tile with the commander (the
 * "Seize" command the movement feature offers there); losing is always the
 * commander falling or nobody being left. [[ObjectiveFlowSystem]] keeps the
 * objective and decides it after every death and on a seize, which stops the
 * turns; [[ObjectiveSystem]] waits for the map to be quiet and puts the
 * outcome banner up - "Victory" or "Defeat", the phase banner's shape, held
 * until a press - and then starts the battle over.
 *
 * The player can look the objective up at any time: the global menu's
 * "Objective" row opens a readout of what wins and loses
 * ([[ObjectiveScreenSystem]]), and while a seize is being fought
 * [[SeizeMarkerRenderSystem]] flags the tile on the map.
 */
export class ObjectiveFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ObjectiveComponent, OutcomeComponent, ObjectiveScreenComponent],
			states: [OutcomeState, ObjectiveScreenState],
			commands: [...outcomeCommands, ...objectiveScreenCommands],
			systems: [
				// Event-driven: keeps and decides the objective.
				{ system: ObjectiveFlowSystem },
				// Ahead of the turn's and the enemy phase's clocks (8), so the banner
				// goes up before either moves on from a quiet map.
				{ system: ObjectiveSystem, priority: 6 },
				// Alongside MenuSystem / RosterSystem in the update phase.
				{ system: ObjectiveScreenSystem, priority: 10 },
				// On the background layer between the terrain art (14) and the range
				// overlays (16, 17): the flag is part of the ground, under the units (18).
				{ system: SeizeMarkerRenderSystem, priority: 15 },
				// Above the corner HUDs (54, 55), with the other full screens.
				{ system: ObjectiveScreenRenderSystem, priority: 56 },
				// Above the phase banner (58): the last thing drawn while it is up.
				{ system: OutcomeRenderSystem, priority: 59 }
			],
			...config
		});
	}
}
