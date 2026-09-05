import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { MapState } from "@/game/map/states/MapState";

/**
 * Drives the cursor of the active battle map: it owns the queries behind map
 * and cursor, runs the commands the current state allows against them and
 * writes the tile the cursor ends up on into its transform.
 *
 * Runs in the update phase, which puts it before the TransformSystem resolves
 * the hierarchy for this frame.
 *
 * One map with one cursor at a time - the map a player is looking at is the
 * only one that exists.
 */
export class CursorSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	public initialize(): void {
		this.queries = {
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent, TransformComponent] }),
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const map = this.queries.grids.getSingleResult();
		const cursor = this.queries.cursors.getSingleResult();

		if (map === null || cursor === null) {
			return;
		}

		this.runCommands(elapsed, frame, { map, cursor });

		const { cellSize } = map.getComponent(GridComponent).read();
		this.syncTransform(cursor, cellSize);
	}

	/**
	 * Commands come from the state on top of the stack. A state pushed over the
	 * map does not list the map commands, which is what stops the cursor while
	 * a menu is open - without this system knowing that menus exist.
	 */
	private runCommands(elapsed: number, frame: number, context: MapCommandContext) {
		const state = this.stateManager.peek();

		if (!(state instanceof MapState)) {
			return;
		}

		for (const command of state.getCommands(MapCommand)) {
			command.execute(elapsed, frame, context);
		}
	}

	private syncTransform(cursor: Entity, cellSize: number) {
		const { column, row } = cursor.getComponent(GridPositionComponent).read();

		const transform = cursor.getComponent(TransformComponent);
		const local = transform.read();

		const x = column * cellSize;
		const y = row * cellSize;

		if (local.x === x && local.y === y) {
			return;
		}

		transform.update({ ...local, x, y });
	}
}
