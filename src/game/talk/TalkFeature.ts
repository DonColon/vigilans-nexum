import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { talkCommands } from "@/game/talk/commands/TalkCommands";
import { TalkChoiceComponent } from "@/game/talk/components/TalkChoiceComponent";
import { TalkComponent } from "@/game/talk/components/TalkComponent";
import { TalkState } from "@/game/talk/states/TalkState";
import { TalkChoiceSystem } from "@/game/talk/systems/TalkChoiceSystem";
import { TalkFlowSystem } from "@/game/talk/systems/TalkFlowSystem";

/**
 * Fire Emblem's "Talk": two units the scenario has written a conversation for
 * can speak when they stand next to each other.
 *
 *  - On `map:ready` the scenario's conversation sheet is read out of the asset
 *    bundle onto a [[TalkComponent]], which also tracks which ones have already
 *    happened. The [[MovementFeature]] asks the talk rules whether there is
 *    anyone to talk to, and only then offers the command.
 *  - `talk:requested` opens [[TalkState]]: the map cursor moves onto the unit
 *    that would be spoken to and any direction steps between the others in
 *    reach, the way the trade screen picks its partner. `talk:confirmed` settles
 *    it and the conversation plays.
 *  - The conversation runs in the ordinary textbox - one page per page, the name
 *    above the box changing as the two go back and forth, and the box itself
 *    holding the top of the screen for whoever opened it and the bottom for
 *    whoever answers, the way Radiant Dawn stages a two-hander.
 *  - The pair is struck off when the box closes, so a talk happens once. Talking
 *    is free: `talk:finished` puts the unit's command menu back and it still has
 *    its turn.
 *
 * Who may talk to whom is content, not code - see
 * `src/assets/data/conversations`.
 *
 * The feature is the wiring; [[TalkFlowSystem]] is the flow.
 */
export class TalkFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [TalkComponent, TalkChoiceComponent],
			states: [TalkState],
			commands: [...talkCommands],
			// Alongside MenuSystem / ForecastSystem in the update phase.
			systems: [
				// Event-driven: the feature's flow. Order among the update systems does not matter.
				{ system: TalkFlowSystem, priority: 7 },
				{ system: TalkChoiceSystem, priority: 10 }
			],
			...config
		});
	}
}
