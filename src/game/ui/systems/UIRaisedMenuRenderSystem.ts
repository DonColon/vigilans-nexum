import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query, QueryList } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { drawMenu } from "@/game/ui/view/UIMenuPanel";
import { uiAssetsReady } from "@/game/ui/view/UIPanel";

/**
 * Draws the menus that asked to be raised - a panel spanning the top of the
 * screen, where the map's corner readouts (the terrain card, the turn
 * counter) sit. Those readouts draw over UIRenderSystem's menus on purpose,
 * so a menu that has to cover them is drawn here, later in the frame, above
 * them and below the banners. Everything else about the menu is the same.
 */
export class UIRaisedMenuRenderSystem extends RenderSystem {
	protected queries!: QueryList;

	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): this {
		this.queries = {
			menus: new Query({ allowlist: [MenuComponent, TransformComponent] })
		};

		return this;
	}

	public execute(): void {
		if (!uiAssetsReady(this.assetStorage)) {
			return;
		}

		const graphics = this.display.getLayer("ui");

		for (const menu of this.queries.menus.getResult()) {
			const data = menu.getComponent(MenuComponent).read();

			if (data.raised) {
				const position = menu.getComponent(TransformComponent).read();
				drawMenu(graphics, this.assetStorage, data, position.x, position.y);
			}
		}
	}
}
