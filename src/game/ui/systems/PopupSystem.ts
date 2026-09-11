import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { PopupCommand } from "@/game/ui/commands/UICommand";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { PopupState } from "@/game/ui/states/PopupState";

/**
 * Drives the open notice: it runs the dismiss command the PopupState allows
 * and, once that command has marked the popup closed, reports it and pops the
 * state. There is nothing to age - a popup shows all of itself at once - so
 * this is the whole of it.
 *
 * One popup at a time - the notice the player is being asked to acknowledge is
 * the only one there is.
 */
export class PopupSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			popups: new Query({ allowlist: [PopupComponent, TransformComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const entity = this.queries.popups.getSingleResult();

		if (entity === null) {
			return;
		}

		const data = entity.getComponent(PopupComponent).read();

		if (data.closed) {
			this.eventSystem.dispatch("ui:popupClosed", { popup: data.id });
			this.stateManager.pop();
			return;
		}

		// The dismiss command comes from the state on top of the stack. If that is
		// not this PopupState the notice just sits there and waits, the same way a
		// textbox waits under whatever was pushed over it.
		const state = this.stateManager.peek();

		if (!(state instanceof PopupState)) {
			return;
		}

		for (const command of state.getCommands(PopupCommand)) {
			command.execute(elapsed, frame, { popup: entity });
		}
	}
}
