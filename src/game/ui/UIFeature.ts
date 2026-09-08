import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { dialogCommands } from "@/game/ui/commands/DialogCommands";
import { menuCommands } from "@/game/ui/commands/MenuCommands";
import { DialogComponent } from "@/game/ui/components/DialogComponent";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { DEMO_MENU_ID, DemoMenuRow, LORE_DIALOG, terrainDialog, tileActionsMenu } from "@/game/ui/model/DemoContent";
import { DialogState } from "@/game/ui/states/DialogState";
import { MenuState } from "@/game/ui/states/MenuState";
import { DialogSystem } from "@/game/ui/systems/DialogSystem";
import { MenuSystem } from "@/game/ui/systems/MenuSystem";
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
 *
 * Both are pushed on top of whatever is running, which freezes it, and report
 * their outcome through events (`ui:menuConfirmed`, `ui:dialogClosed`) rather
 * than calling back - so a menu does not need to know what its rows mean.
 */
export class UIFeature extends GameFeature {
	private readonly demo: boolean;
	private lastTile: { column: number; row: number; terrain: string } | null = null;

	constructor(config: UIFeatureConfig = {}) {
		super({
			components: [DialogComponent, MenuComponent],
			states: [DialogState, MenuState],
			commands: [...dialogCommands, ...menuCommands],
			systems: [
				// Both update systems run before the sync phase resolves transforms,
				// like CursorSystem. The renderer owns the "ui" layer and sits above
				// the map renderers.
				{ system: DialogSystem, priority: 10 },
				{ system: MenuSystem, priority: 10 },
				{ system: UIRenderSystem, priority: 50 }
			],
			...config
		});

		this.demo = config.demo ?? true;
	}

	protected onInstall(): void {
		if (!this.demo) {
			return;
		}

		this.subscribe("map:tileConfirmed", (event) => {
			this.lastTile = { column: event.column, row: event.row, terrain: event.terrain };

			this.stateManager.getState(MenuState).request(tileActionsMenu(event.terrain));
			this.stateManager.push(MenuState);
		});

		this.subscribe("ui:menuConfirmed", (event) => {
			if (event.menu !== DEMO_MENU_ID) {
				return;
			}

			const dialog = this.stateManager.getState(DialogState);

			if (event.row === DemoMenuRow.INSPECT && this.lastTile) {
				dialog.request(terrainDialog(this.lastTile.terrain, this.lastTile.column, this.lastTile.row));
				this.stateManager.push(DialogState);
			} else if (event.row === DemoMenuRow.LORE) {
				dialog.request(LORE_DIALOG);
				this.stateManager.push(DialogState);
			}
		});
	}
}
