import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitData, UnitFaction } from "@/game/units/model/UnitData";

/** A unit reduced to its id and tile - all the movement math needs about it. */
export interface UnitLocation {
	id: string;
	column: number;
	row: number;
}

/**
 * Pure lookups over the units on the map, kept off the components the same way
 * `GridSystem` is. Everything here works on the entity list a caller already
 * holds; `inWorld` is the one exception - it is where that list comes from for
 * a caller with no query of its own.
 */
export class UnitSystem {
	/** Every unit currently on the map. For features and tests; systems use a query. */
	public static inWorld(world: World): Entity[] {
		return world.getEntities().filter((entity) => entity.hasComponent(UnitComponent));
	}

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

	/** The units fighting for `faction`. */
	public static ofFaction(units: readonly Entity[], faction: UnitFaction): Entity[] {
		return units.filter((unit) => unit.getComponent(UnitComponent).read().faction === faction);
	}

	/** The units `faction` is up against - everyone not fighting for it. */
	public static enemiesOf(units: readonly Entity[], faction: UnitData["faction"]): Entity[] {
		return units.filter((unit) => unit.getComponent(UnitComponent).read().faction !== faction);
	}

	/** Every unit's id and tile, the form the movement math consumes. */
	public static locations(units: readonly Entity[]): UnitLocation[] {
		return units.map((unit) => {
			const position = unit.getComponent(GridPositionComponent).read();
			return { id: unit.getComponent(UnitComponent).read().id, column: position.column, row: position.row };
		});
	}

	/** The tile a unit stands on. */
	public static tileOf(unit: Entity): { column: number; row: number } {
		return unit.getComponent(GridPositionComponent).read();
	}
}
