import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { DEMO_MENU_ID, DemoMenuRow, LORE_DIALOG, terrainDialog, tileActionsMenu } from "@/game/ui/content/DemoContent";
import { DialogState } from "@/game/ui/states/DialogState";
import { MenuState } from "@/game/ui/states/MenuState";

/**
 * The built-in demo of the textboxes and menus: confirm on a map tile opens a
 * tile menu, and two of its rows open textboxes. Registered by [[UIFeature]]
 * only when its `demo` option is on.
 */
export class UIDemoSystem extends ReactiveSystem {
	private lastTile: { column: number; row: number; terrain: string } | null = null;

	public initialize(): this {
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

		return this;
	}
}
