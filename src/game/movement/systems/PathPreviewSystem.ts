import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { MovementComponent } from "@/game/movement/components/MovementComponent";
import { tileKey, blockedTiles, movementPath, hasTile } from "@/game/movement/rules/Pathfinding";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitById, unitLocations } from "@/game/units/rules/UnitLookup";

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

	public initialize(): this {
		this.queries = {
			movements: new Query({ allowlist: [MovementComponent] }),
			grids: new Query({ allowlist: [GridComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] }),
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] })
		};

		return this;
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
		const cursorKey = tileKey(cursor.column, cursor.row);

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
		const mover = unitById(units, movement.unitId);
		const data = mover?.getComponent(UnitComponent).read();
		const blocked = data ? blockedTiles(unitLocations(units), data) : new Set<string>();
		const budget = data?.stats.movement ?? 0;

		const path = hasTile(movement.movement, cursor.column, cursor.row) ? movementPath(gridEntity.getComponent(GridComponent).read(), origin, cursor, budget, blocked) : [];

		component.update({ ...movement, path });
	}
}
