import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";

/**
 * Advances every walking unit along its move path. The unit's logical tile is
 * already the destination - this only runs the clock the renderer reads. When a
 * unit reaches the end its `WalkComponent` is dropped and `unit:moved` is
 * announced, so the rest of the game hears the move land once the token has
 * actually arrived.
 */
export class UnitWalkSystem extends UpdateSystem {
	@GameCoreService(EventSystem)
	private events!: EventSystem;

	public initialize(): void {
		this.queries = {
			walkers: new Query({ allowlist: [WalkComponent, UnitComponent] })
		};
	}

	public execute(elapsed: number): void {
		for (const entity of this.queries.walkers.getResult()) {
			const component = entity.getComponent(WalkComponent);
			const walk = component.read();
			const next = walk.elapsed + elapsed;

			if (next < walk.duration) {
				component.update({ ...walk, elapsed: next });
				continue;
			}

			const from = walk.path[0];
			const to = walk.path[walk.path.length - 1];

			entity.removeComponent(WalkComponent);

			this.events.dispatch("unit:moved", {
				unitId: entity.getComponent(UnitComponent).read().id,
				fromColumn: from.column,
				fromRow: from.row,
				toColumn: to.column,
				toRow: to.row
			});
		}
	}
}
