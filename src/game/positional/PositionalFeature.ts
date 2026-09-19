import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { positionalCommands } from "@/game/positional/commands/PositionalCommands";
import { PositionalChoiceComponent } from "@/game/positional/components/PositionalChoiceComponent";
import { PositionalComponent } from "@/game/positional/components/PositionalComponent";
import { PositionalState } from "@/game/positional/states/PositionalState";
import { PositionalChoiceSystem } from "@/game/positional/systems/PositionalChoiceSystem";
import { PositionalFlowSystem } from "@/game/positional/systems/PositionalFlowSystem";
import { PositionalRenderSystem } from "@/game/positional/systems/PositionalRenderSystem";

/**
 * The Base tier's positional abilities - Swap, Shove, Reposition, Knockback,
 * Draw Back and Mystic Pull - the movement tools a fresh army learns first
 * (`design/catalog/Abilities.md`). A unit that has one on its sheet gets a
 * command-menu row for it whenever somebody is in reach; choosing it points
 * the map cursor at who would be moved and shows where they would land, and
 * confirming slides the pieces and spends the unit.
 *
 * The feature is the wiring; [[PositionalFlowSystem]] is the flow.
 */
export class PositionalFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [PositionalComponent, PositionalChoiceComponent],
			states: [PositionalState],
			commands: [...positionalCommands],
			systems: [
				// Event-driven: the feature's flow.
				{ system: PositionalFlowSystem },
				// Alongside the other target choices (talk, staff) in the screens band.
				{ system: PositionalChoiceSystem, priority: 10 },
				// On the "background" layer above UnitRenderSystem (18), so the landing wash reads over a token.
				{ system: PositionalRenderSystem, priority: 19 }
			],
			...config
		});
	}
}
