import { Entity } from "@/core/ecs/Entity";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuCommand } from "@/game/ui/commands/UICommand";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";

/**
 * Drives the open menu: it runs the navigation commands the MenuState allows
 * and, the moment the player confirms a row or backs out, reports the outcome
 * through an event. It never acts on the choice - the code that opened the menu
 * listens for `ui:menuConfirmed` and decides what the row means.
 *
 * When a submenu is layered on top (see MenuState) the commands drive that
 * panel, and confirm / cancel closes just the submenu; the base menu stays. A
 * `keepOpen` base menu reports a confirmed row without closing, so its opener
 * can layer a submenu on. Otherwise confirm / cancel pops the whole state.
 */
export class MenuSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof MenuState)) {
			return;
		}

		const entity = state.getActiveMenu();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(MenuComponent);
		const data = component.read();

		if (data.cancelled) {
			this.eventSystem.dispatch("ui:menuCancelled", { menu: data.id });

			if (state.hasSubmenu()) {
				state.closeSubmenu();
			} else {
				this.stateManager.pop();
			}

			return;
		}

		if (data.confirmedIndex >= 0) {
			this.eventSystem.dispatch("ui:menuConfirmed", {
				menu: data.id,
				row: data.ids[data.confirmedIndex] ?? "",
				index: data.confirmedIndex,
				item: data.items[data.confirmedIndex] ?? ""
			});

			if (state.hasSubmenu()) {
				state.closeSubmenu();
			} else if (data.keepOpen) {
				component.update({ ...data, confirmedIndex: -1 });
			} else {
				this.stateManager.pop();
			}

			return;
		}

		this.runCommands(elapsed, frame, state, entity);
	}

	private runCommands(elapsed: number, frame: number, state: MenuState, menu: Entity): void {
		for (const command of state.getCommands(MenuCommand)) {
			command.execute(elapsed, frame, { menu });
		}
	}
}
