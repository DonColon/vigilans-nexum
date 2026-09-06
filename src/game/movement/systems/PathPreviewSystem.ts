import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { MovementComponent } from "@/game/movement/components/MovementComponent";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * While a unit is picked up, keeps `MovementComponent.path` in step with the
 * cursor - the shortest route from the unit's tile to the tile the cursor is
 * on, as long as that tile is inside the movement range. Recomputed only when
 * the cursor actually changes tile.
 *
 * Runs after CursorSystem (priority 10) so it reads this frame's cursor tile.
 */
export class PathPreviewSystem extends UpdateSystem {
	private lastKey = "";

	public initialize(): void {
		this.queries = {
			movements: new Query({ allowlist: [MovementComponent] }),
			grids: new Query({ allowlist: [GridComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] }),
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] })
		};
	}

	public execute(): void {
		const movementEntity = this.queries.movements.getSingleResult();
		const gridEntity = this.queries.grids.getSingleResult();
		const cursorEntity = this.queries.cursors.getSingleResult();

		if (movementEntity === null || gridEntity === null || cursorEntity === null) {
			return;
		}

		const component = movementEntity.getComponent(MovementComponent);
		const movement = component.read();
		const cursor = cursorEntity.getComponent(GridPositionComponent).read();
		const cursorKey = MovementSystem.tileKey(cursor.column, cursor.row);

		if (movement.unitId.length === 0) {
			this.lastKey = "";

			if (movement.path.length > 0) {
				component.update({ ...movement, path: [] });
			}

			return;
		}

		if (cursorKey === this.lastKey) {
			return;
		}

		this.lastKey = cursorKey;

		const origin = { column: movement.originColumn, row: movement.originRow };
		const units = this.queries.units.getResult();
		const blocked = MovementSystem.blockedTiles(UnitSystem.locations(units), movement.unitId);
		const mover = UnitSystem.byId(units, movement.unitId);
		const budget = mover ? mover.getComponent(UnitComponent).read().movement : 0;

		const path = MovementSystem.contains(movement.movement, cursor.column, cursor.row) ? MovementSystem.path(gridEntity.getComponent(GridComponent).read(), origin, cursor, budget, blocked) : [];

		component.update({ ...movement, path });
	}
}
