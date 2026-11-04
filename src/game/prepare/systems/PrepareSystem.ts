import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MapCommand } from "@/game/map/commands/MapCommand";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { activeCursor, activeMap } from "@/game/map/rules/ActiveMap";
import { PrepareCommand } from "@/game/prepare/commands/PrepareCommands";
import { PrepareComponent } from "@/game/prepare/components/PrepareComponent";
import { PrepareState } from "@/game/prepare/states/PrepareState";

/**
 * Drives the preparations screen while [[PrepareState]] is on top: runs the
 * map's cursor commands with the map's own context - the cursor system only
 * polls the map state, so this stands in for it - and the prepare commands,
 * and reports a press as `prepare:confirmed` with the cursor's tile, or
 * `prepare:cancelled`. What either means is the flow's, by mode.
 *
 * Runs just ahead of CursorSystem (10), which syncs the cursor's transform
 * after any command has moved it, so a move lands on screen the same frame.
 */
export class PrepareSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private events!: EventBus;

	@GameCoreService(World)
	private world!: World;

	public initialize(): this {
		return this;
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof PrepareState)) {
			return;
		}

		const prepare = this.world.entityWith(PrepareComponent);
		const map = activeMap(this.world);
		const cursor = activeCursor(this.world);

		if (prepare === null || map === null || cursor === null) {
			return;
		}

		for (const command of state.getCommands(MapCommand)) {
			command.execute(elapsed, frame, { map, cursor });
		}

		for (const command of state.getCommands(PrepareCommand)) {
			command.execute(elapsed, frame, { prepare });
		}

		const component = prepare.getComponent(PrepareComponent);
		const data = component.read();

		if (data.confirmed) {
			const { column, row } = cursor.getComponent(GridPositionComponent).read();
			component.update({ ...data, confirmed: false });
			this.events.dispatch("prepare:confirmed", { column, row });
		} else if (data.cancelled) {
			component.update({ ...data, cancelled: false });
			this.events.dispatch("prepare:cancelled", {});
		}
	}
}
