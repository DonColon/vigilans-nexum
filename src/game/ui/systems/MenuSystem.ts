import { Entity } from "@/core/ecs/Entity";
import { Query, QueryList } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuCommand } from "@/game/ui/commands/UICommand";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";

/**
 * Drives the open menu: it runs the navigation commands the MenuState allows
 * and, the moment the player confirms a row or backs out, reports the outcome
 * through an event and pops the state. It never acts on the choice - the code
 * that opened the menu listens for `ui:menuConfirmed` and decides what the row
 * means.
 */
export class MenuSystem extends UpdateSystem {
	protected queries!: QueryList;

	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			menus: new Query({ allowlist: [MenuComponent, TransformComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const entity = this.queries.menus.getSingleResult();

		if (entity === null) {
			return;
		}

		const data = entity.getComponent(MenuComponent).read();

		if (data.cancelled) {
			this.eventSystem.dispatch("ui:menuCancelled", { menu: data.id });
			this.stateManager.pop();
			return;
		}

		if (data.confirmedIndex >= 0) {
			this.eventSystem.dispatch("ui:menuConfirmed", {
				menu: data.id,
				index: data.confirmedIndex,
				item: data.items[data.confirmedIndex] ?? ""
			});
			this.stateManager.pop();
			return;
		}

		this.runCommands(elapsed, frame, entity);
	}

	private runCommands(elapsed: number, frame: number, menu: Entity): void {
		const state = this.stateManager.peek();

		if (!(state instanceof MenuState)) {
			return;
		}

		for (const command of state.getCommands(MenuCommand)) {
			command.execute(elapsed, frame, { menu });
		}
	}
}
