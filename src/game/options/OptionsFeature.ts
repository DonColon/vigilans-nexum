import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { optionsCommands } from "@/game/options/commands/OptionsCommands";
import { OptionsComponent } from "@/game/options/components/OptionsComponent";
import { OptionsState } from "@/game/options/states/OptionsState";
import { OptionsRenderSystem } from "@/game/options/systems/OptionsRenderSystem";
import { OptionsSystem } from "@/game/options/systems/OptionsSystem";
import { OptionsFlowSystem } from "@/game/options/systems/OptionsFlowSystem";

/**
 * The options screen, opened from the map's own command menu.
 *
 *  - `options:requested` (the "Options" row of the global menu) opens an
 *    [[OptionsState]] over the map, which freezes it the way a menu does.
 *  - Up and down pick a setting, left and right change it, confirm or cancel
 *    closes. A change lands the moment it is made - there is no "apply".
 *  - The settings themselves live on the [[OptionsService]], not on this
 *    feature, because the things they affect are scattered: the textbox paces
 *    its reveal by one, the grid renderer draws its lines by another, the combat
 *    feature decides whether to play an animation by a third. This feature only
 *    owns the *screen*. Even the language is applied by the service, which
 *    switches the I18nService the moment the setting changes - so a cycle takes
 *    effect under the cursor rather than on the way out.
 *
 * Settings are written down as they change and read back on the next visit.
 *
 * Fullscreen is the one that cannot simply be restored. A page is not allowed to
 * enter fullscreen on load - the browser requires a real user gesture behind the
 * request and refuses without one - so a remembered "on" is carried until the
 * player touches something, and applied on that first gesture. It is the closest
 * the web allows to starting in fullscreen, and it is the same trick the
 * AudioMixer uses to unlock its AudioContext.
 *
 * The feature is the wiring; [[OptionsFlowSystem]] is the flow.
 */
export class OptionsFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [OptionsComponent],
			states: [OptionsState],
			commands: [...optionsCommands],
			systems: [
				// Event-driven: the feature's flow. Order among the update systems does not matter.
				{ system: OptionsFlowSystem, priority: 7 },
				// Alongside MenuSystem / RosterSystem in the update phase.
				{ system: OptionsSystem, priority: 10 },
				// Above the corner HUDs (54, 55), like the army list.
				{ system: OptionsRenderSystem, priority: 56 }
			],
			...config
		});
	}
}
