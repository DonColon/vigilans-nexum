import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { dialogCommands } from "@/game/ui/commands/DialogCommands";
import { menuCommands } from "@/game/ui/commands/MenuCommands";
import { popupCommands } from "@/game/ui/commands/PopupCommands";
import { DialogComponent } from "@/game/ui/components/DialogComponent";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { DialogState } from "@/game/ui/states/DialogState";
import { MenuState } from "@/game/ui/states/MenuState";
import { PopupState } from "@/game/ui/states/PopupState";
import { DialogSystem } from "@/game/ui/systems/DialogSystem";
import { MenuSystem } from "@/game/ui/systems/MenuSystem";
import { PopupSystem } from "@/game/ui/systems/PopupSystem";
import { UIDemoSystem } from "@/game/ui/systems/UIDemoSystem";
import { UIRenderSystem } from "@/game/ui/systems/UIRenderSystem";

export interface UIFeatureConfig extends GameFeatureConfig {
	/**
	 * Wire the built-in demo: confirm on a map tile opens a tile menu, and two
	 * of its rows open textboxes. On by default so `npm start` shows the feature
	 * working; set it to false to use DialogState / MenuState on your own terms.
	 */
	demo?: boolean;
}

/**
 * Textboxes and menus, drawn with the tinted Kenney "Fantasy UI Borders" art.
 *
 *  - DialogState shows some pages of text that reveal a word at a time.
 *  - MenuState shows a list the player moves a highlight through.
 *  - PopupState shows a short notice the player acknowledges with one press.
 *
 * Both are pushed on top of whatever is running, which freezes it, and report
 * their outcome through events (`ui:menuConfirmed`, `ui:dialogClosed`,
 * `ui:popupClosed`) rather
 * than calling back - so a menu does not need to know what its rows mean.
 *
 * The feature is the wiring; the demo, when it is on, is [[UIDemoSystem]].
 */
export class UIFeature extends GameFeature {
	constructor(config: UIFeatureConfig = {}) {
		super({
			components: [DialogComponent, MenuComponent, PopupComponent],
			states: [DialogState, MenuState, PopupState],
			commands: [...dialogCommands, ...menuCommands, ...popupCommands],
			systems: [
				// Event-driven: the demo's tile menu and textboxes.
				...((config.demo ?? true) ? [{ system: UIDemoSystem, priority: 7 }] : []),
				// Both update systems run before the sync phase resolves transforms,
				// like CursorSystem. The renderer owns the "ui" layer and sits above
				// the map renderers.
				{ system: DialogSystem, priority: 10 },
				{ system: MenuSystem, priority: 10 },
				{ system: PopupSystem, priority: 10 },
				{ system: UIRenderSystem, priority: 50 }
			],
			...config
		});
	}
}
