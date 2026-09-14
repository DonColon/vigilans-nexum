import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { experienceCommands } from "@/game/experience/commands/ExperienceCommands";
import { ExperienceComponent } from "@/game/experience/components/ExperienceComponent";
import { ExperienceState } from "@/game/experience/states/ExperienceState";
import { ExperienceRenderSystem } from "@/game/experience/systems/ExperienceRenderSystem";
import { ExperienceSystem } from "@/game/experience/systems/ExperienceSystem";
import { ExperienceFlowSystem } from "@/game/experience/systems/ExperienceFlowSystem";

/**
 * Fire Emblem: Radiant Dawn's experience: the player's units earn points for
 * fighting and for healing, and every hundredth point is a level.
 *
 *  - A fight is scored on `combat:fought`, while both sides are still on the
 *    map to read a level and a class off: a kill is worth the most, a hit that
 *    hurt less, a swing that never landed a single point - see
 *    `rules/Experience` for the formulas. The points go on the unit right away
 *    (the way the fight's HP already did) but the *showing* waits for
 *    `combat:resolved`, once the animation has landed, so the bar follows the
 *    fight rather than interrupting it. Both sides are scored - a player unit
 *    attacked on the enemy's turn earns for defending itself - but only player
 *    units keep anything. An enemy never levels.
 *  - A staff is scored on `staff:resolved` for the staff's own value, and
 *    shown at once.
 *  - The showing is an [[ExperienceState]] over the map: the bar in the middle
 *    of the screen fills point by point and, at a level, gives way to the
 *    level-up panel - the level rolls over and every stat that rose lights up
 *    in turn, until a press takes it down. One display at a time - when both
 *    sides of a fight earned, the second waits for the first to be dismissed.
 *    With battle animations turned off the bar starts full and the panel
 *    starts with every gain on show; it still asks to be read.
 *
 * `experience:gained` reports the points the moment they land;
 * `experience:shown` once the player has seen them.
 *
 * The feature is the wiring; [[ExperienceFlowSystem]] is the flow.
 */
export class ExperienceFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ExperienceComponent],
			states: [ExperienceState],
			commands: [...experienceCommands],
			systems: [
				// Event-driven: the feature's flow. Order among the update systems does not matter.
				{ system: ExperienceFlowSystem, priority: 7 },
				// The bar's clock, alongside the battle animation's.
				{ system: ExperienceSystem, priority: 8 },
				// After UIRenderSystem (50), which owns and clears the "ui" layer.
				{ system: ExperienceRenderSystem, priority: 52 }
			],
			...config
		});
	}
}
