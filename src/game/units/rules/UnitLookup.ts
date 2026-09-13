import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent, UnitData, UnitFaction } from "@/game/units/components/UnitComponent";

/** A unit reduced to its id, side and tile - all the movement math needs about it. */
export interface UnitLocation {
	id: string;
	faction: UnitFaction;
	column: number;
	row: number;
}

/**
 * Pure lookups over the units on the map. Everything here works on the entity
 * list a caller already holds; `unitsInWorld` is the one exception - it is
 * where that list comes from for a caller with no query of its own.
 */

/** Every unit currently on the map. For features and tests; systems use a query. */
export function unitsInWorld(world: World): Entity[] {
	return world.entitiesWith(UnitComponent);
}

/** The unit standing on a tile, or null when it is empty. */
export function unitAt(units: readonly Entity[], column: number, row: number): Entity | null {
	for (const unit of units) {
		const position = unit.getComponent(GridPositionComponent).read();

		if (position.column === column && position.row === row) {
			return unit;
		}
	}

	return null;
}

/** The unit carrying the given id, or null. */
export function unitById(units: readonly Entity[], id: string): Entity | null {
	for (const unit of units) {
		if (unit.getComponent(UnitComponent).read().id === id) {
			return unit;
		}
	}

	return null;
}

/** The units fighting for `faction`. */
export function unitsOfFaction(units: readonly Entity[], faction: UnitFaction): Entity[] {
	return units.filter((unit) => unit.getComponent(UnitComponent).read().faction === faction);
}

/** The units `faction` is up against - everyone not fighting for it. */
export function enemiesOf(units: readonly Entity[], faction: UnitData["faction"]): Entity[] {
	return units.filter((unit) => unit.getComponent(UnitComponent).read().faction !== faction);
}

/**
 * The other units standing on a tile orthogonally next to this one, whichever
 * side they fight for - who it is close enough to reach out to. A spent unit
 * counts: being traded with, or talked to, costs the other party nothing.
 */
export function unitsBeside(units: readonly Entity[], unit: Entity): Entity[] {
	const tile = tileOf(unit);

	return units.filter((other) => other !== unit && GridPositionComponent.distance(tileOf(other), tile) === 1);
}

/** Of those, the ones on `unit`'s own side - the allies it could trade packs with. */
export function alliesBeside(units: readonly Entity[], unit: Entity): Entity[] {
	const faction = unit.getComponent(UnitComponent).read().faction;

	return unitsBeside(units, unit).filter((other) => other.getComponent(UnitComponent).read().faction === faction);
}

/** Every unit's id, side and tile, the form the movement math consumes. */
export function unitLocations(units: readonly Entity[]): UnitLocation[] {
	return units.map((unit) => {
		const position = unit.getComponent(GridPositionComponent).read();
		const data = unit.getComponent(UnitComponent).read();
		return { id: data.id, faction: data.faction, column: position.column, row: position.row };
	});
}

/** The tile a unit stands on. */
export function tileOf(unit: Entity): { column: number; row: number } {
	return unit.getComponent(GridPositionComponent).read();
}
