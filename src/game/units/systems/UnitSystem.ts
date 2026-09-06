import { Entity } from "@/core/ecs/Entity";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";

/** A unit reduced to its id and tile - all the movement math needs about it. */
export interface UnitLocation {
	id: string;
	column: number;
	row: number;
}

/**
 * Pure lookups over the units on the map, kept off the components the same way
 * `GridSystem` is. Operates on the entity list a caller already holds, so it
 * never touches a World or a query itself.
 */
export class UnitSystem {
	/** The unit standing on a tile, or null when it is empty. */
	public static unitAt(units: readonly Entity[], column: number, row: number): Entity | null {
		for (const unit of units) {
			const position = unit.getComponent(GridPositionComponent).read();

			if (position.column === column && position.row === row) {
				return unit;
			}
		}

		return null;
	}

	/** The unit carrying the given id, or null. */
	public static byId(units: readonly Entity[], id: string): Entity | null {
		for (const unit of units) {
			if (unit.getComponent(UnitComponent).read().id === id) {
				return unit;
			}
		}

		return null;
	}

	/** Every unit's id and tile, the form the movement math consumes. */
	public static locations(units: readonly Entity[]): UnitLocation[] {
		return units.map((unit) => {
			const position = unit.getComponent(GridPositionComponent).read();
			return { id: unit.getComponent(UnitComponent).read().id, column: position.column, row: position.row };
		});
	}
}
