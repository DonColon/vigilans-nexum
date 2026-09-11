import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { OptionsCommand } from "@/game/options/commands/OptionsCommands";
import { OptionsComponent } from "@/game/options/components/OptionsComponent";
import { OptionsState } from "@/game/options/states/OptionsState";

/**
 * Drives the open options screen: it runs the commands the OptionsState allows
 * and, once one of them has marked the screen closed, reports it and pops the
 * state. The settings themselves are written straight to the OptionsService by
 * the cycling commands, so there is nothing to save here.
 */
export class OptionsSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			screens: new Query({ allowlist: [OptionsComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const entity = this.queries.screens.getSingleResult();

		if (entity === null) {
			return;
		}

		const data = entity.getComponent(OptionsComponent).read();

		if (data.closed) {
			// Reported before the pop takes the entity with it, and carrying the row,
			// because the event is delivered a tick later - by then there is no
			// screen left to ask.
			this.eventSystem.dispatch("options:closed", { selectedIndex: data.selectedIndex });
			this.stateManager.pop();
			return;
		}

		const state = this.stateManager.peek();

		if (!(state instanceof OptionsState)) {
			return;
		}

		for (const command of state.getCommands(OptionsCommand)) {
			command.execute(elapsed, frame, { options: entity });
		}
	}
}
