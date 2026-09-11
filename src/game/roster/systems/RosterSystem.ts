import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { RosterCommand } from "@/game/roster/commands/RosterCommands";
import { RosterComponent } from "@/game/roster/components/RosterComponent";
import { RosterState } from "@/game/roster/states/RosterState";

/**
 * Drives the open army list: it runs the commands the RosterState allows and,
 * once one of them has marked the list closed, reports it and pops the state.
 * There is nothing to age - the table shows all of itself at once - so this is
 * the whole of it.
 *
 * One list at a time; the army the player is looking at is the only one there is.
 */
export class RosterSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			rosters: new Query({ allowlist: [RosterComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const entity = this.queries.rosters.getSingleResult();

		if (entity === null) {
			return;
		}

		const data = entity.getComponent(RosterComponent).read();

		if (data.closed) {
			// Reported before the pop takes the entity with it, and carrying the row,
			// because the event is delivered a tick later - by then there is no list
			// left to ask.
			this.eventSystem.dispatch("roster:closed", { selectedIndex: data.selectedIndex });
			this.stateManager.pop();
			return;
		}

		// The commands come from the state on top of the stack. If that is not this
		// RosterState the table just sits there, the same way the map waits under it.
		const state = this.stateManager.peek();

		if (!(state instanceof RosterState)) {
			return;
		}

		for (const command of state.getCommands(RosterCommand)) {
			command.execute(elapsed, frame, { roster: entity });
		}
	}
}
