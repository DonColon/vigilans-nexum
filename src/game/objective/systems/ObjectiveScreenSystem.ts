import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ObjectiveScreenCommand } from "@/game/objective/commands/ObjectiveScreenCommands";
import { ObjectiveScreenComponent } from "@/game/objective/components/ObjectiveScreenComponent";
import { ObjectiveScreenState } from "@/game/objective/states/ObjectiveScreenState";

/**
 * Drives the open objective screen: it runs the commands the
 * ObjectiveScreenState allows and, once one of them has marked the screen
 * closed, reports `objective:closed` and pops the state. There is nothing to
 * age - the readout shows all of itself at once - so this is the whole of it.
 *
 * One screen at a time; the battle the player is looking at is the only one
 * there is.
 */
export class ObjectiveScreenSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private eventBus!: EventBus;

	public initialize(): this {
		this.queries = {
			screens: new Query({ allowlist: [ObjectiveScreenComponent] })
		};

		return this;
	}

	public execute(elapsed: number, frame: number): void {
		const entity = this.queries.screens.getSingleResult();

		if (entity === null) {
			return;
		}

		if (entity.getComponent(ObjectiveScreenComponent).read().closed) {
			this.eventBus.dispatch("objective:closed", {});
			this.stateManager.pop();
			return;
		}

		// The commands come from the state on top of the stack. If that is not this
		// ObjectiveScreenState the readout just sits there, the way the map waits under it.
		const state = this.stateManager.peek();

		if (!(state instanceof ObjectiveScreenState)) {
			return;
		}

		for (const command of state.getCommands(ObjectiveScreenCommand)) {
			command.execute(elapsed, frame, { screen: entity });
		}
	}
}
