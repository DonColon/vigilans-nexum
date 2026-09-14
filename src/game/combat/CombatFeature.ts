import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { forecastCommands } from "@/game/combat/commands/ForecastCommands";
import { BattleAnimationComponent } from "@/game/combat/components/BattleAnimationComponent";
import { CombatAnimationComponent } from "@/game/combat/components/CombatAnimationComponent";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";
import { BattleAnimationSystem } from "@/game/combat/systems/BattleAnimationSystem";
import { CombatFlowSystem } from "@/game/combat/systems/CombatFlowSystem";
import { ForecastRenderSystem } from "@/game/combat/systems/ForecastRenderSystem";
import { ForecastSystem } from "@/game/combat/systems/ForecastSystem";
import { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";
import { ForecastState } from "@/game/combat/states/ForecastState";

/**
 * The Fire Emblem attack flow, layered on top of the [[MovementFeature]]:
 *
 *  - `combat:requested` (the "Attack" command, with a target) opens the battle
 *    forecast - a [[ForecastState]] with the two units and the attacker's
 *    reaching weapons. `< >` cycles the weapon, `ForecastRenderSystem` redraws
 *    the numbers (each side tinted its faction colour), confirm fires
 *    `combat:confirmed`, cancel `combat:cancelled`.
 *  - `combat:confirmed` readies the chosen weapon, resolves the fight with
 *    `resolveCombat` (Radiant Dawn formulas, real rolls), writes HP / weapon
 *    uses back, and hands off to a [[BattleAnimationState]]: the lunge / flash /
 *    HP-drain animation plays, then `unit:died` takes any fallen unit off the
 *    map and `combat:resolved` lets MovementFeature spend the attacker.
 *
 * The feature is the wiring; [[CombatFlowSystem]] is the flow.
 */
export class CombatFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ForecastComponent, BattleAnimationComponent, CombatAnimationComponent],
			states: [ForecastState, BattleAnimationState],
			commands: [...forecastCommands],
			systems: [
				// Event-driven: the attack flow. Order among the update systems does not matter.
				{ system: CombatFlowSystem, priority: 7 },
				// The animation clock; order among the update systems does not matter.
				{ system: BattleAnimationSystem, priority: 8 },
				// Alongside MenuSystem / DialogSystem in the update phase.
				{ system: ForecastSystem, priority: 10 },
				// After UIRenderSystem (50), which owns and clears the "ui" layer.
				{ system: ForecastRenderSystem, priority: 52 }
			],
			...config
		});
	}
}
