import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { outcomeCommands } from "@/game/objective/commands/OutcomeCommands";
import { ObjectiveComponent } from "@/game/objective/components/ObjectiveComponent";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
import { OutcomeState } from "@/game/objective/states/OutcomeState";
import { ObjectiveFlowSystem } from "@/game/objective/systems/ObjectiveFlowSystem";
import { ObjectiveSystem } from "@/game/objective/systems/ObjectiveSystem";
import { OutcomeRenderSystem } from "@/game/objective/systems/OutcomeRenderSystem";

/**
 * What the battle is for, and when it is over. The deployment sheet names the
 * objective - rout every enemy, or seize a tile with the commander (the
 * "Seize" command the movement feature offers there); losing is always the
 * commander falling or nobody being left. [[ObjectiveFlowSystem]] keeps the
 * objective and decides it after every death and on a seize, which stops the
 * turns; [[ObjectiveSystem]] waits for the map to be quiet and puts the
 * outcome banner up - "Victory" or "Defeat", the phase banner's shape, held
 * until a press - and then starts the battle over.
 */
export class ObjectiveFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ObjectiveComponent, OutcomeComponent],
			states: [OutcomeState],
			commands: [...outcomeCommands],
			systems: [
				// Event-driven: keeps and decides the objective.
				{ system: ObjectiveFlowSystem },
				// Ahead of the turn's and the enemy phase's clocks (8), so the banner
				// goes up before either moves on from a quiet map.
				{ system: ObjectiveSystem, priority: 6 },
				// Above the phase banner (58): the last thing drawn while it is up.
				{ system: OutcomeRenderSystem, priority: 59 }
			],
			...config
		});
	}
}
