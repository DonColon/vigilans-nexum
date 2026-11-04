import { Entity } from "@/core/ecs/Entity";
import { LocksComponent, LocksData, LockTileData } from "@/game/locks/components/LocksComponent";
import { Chest, Door } from "@/game/locks/content/Locks";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { TileMapComponent, TileMapData } from "@/game/map/components/TileMapComponent";
import { LockKind } from "@/game/units/content/UnitCatalog";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { tileOf } from "@/game/units/rules/UnitLookup";

/*
 * Who can open what from where: the map's locks held against the unit beside
 * them and the tile map they are drawn on. Everything here works on the data a
 * caller already holds, so a feature, a system or a test can call it directly.
 *
 * A door is opened from beside it - the door tile is a wall until it opens, so
 * nobody can stand on it. A chest is opened from on top of it, Fire Emblem's
 * stance, or from beside it, so the two commands read the same way to the
 * player. Either way the unit needs the matching key in its pack; a thief
 * class that picks locks without one would slot in at `UnitComponent.canUnlock`.
 */

/**
 * Every shut door `unit` could open: the ones on a tile orthogonally next to
 * it, provided it carries a door key. In the order the scenario listed them.
 */
export function doorsBeside(data: LocksData, unit: Entity): Door[] {
	if (!UnitComponent.canUnlock(unit.getComponent(UnitComponent).read(), LockKind.DOOR)) {
		return [];
	}

	const tile = tileOf(unit);

	return LocksComponent.closedDoors(data).filter((door) => GridPositionComponent.distance(door, tile) === 1);
}

/**
 * The door `unit` would open - the first one beside it. Doors on the shipped
 * map stand well apart, so a unit is never beside two; if a scenario ever puts
 * two on one corner, this is where a "which one?" step would go, and
 * `doorsBeside` is what it would ask.
 */
export function doorBeside(data: LocksData, unit: Entity): Door | null {
	return doorsBeside(data, unit)[0] ?? null;
}

/**
 * Every shut chest `unit` could open: the one under it, and any on a tile
 * orthogonally next to it, provided it carries a chest key. The one under it
 * comes first, the rest in the order the scenario listed them.
 */
export function chestsAt(data: LocksData, unit: Entity): Chest[] {
	if (!UnitComponent.canUnlock(unit.getComponent(UnitComponent).read(), LockKind.CHEST)) {
		return [];
	}

	const tile = tileOf(unit);

	return LocksComponent.closedChests(data)
		.map((chest) => ({ chest, distance: GridPositionComponent.distance(chest, tile) }))
		.filter(({ distance }) => distance <= 1)
		.sort((first, second) => first.distance - second.distance)
		.map(({ chest }) => chest);
}

/** The shut chest `unit` would open - the one it stands on, else the first beside it - or null. */
export function chestAt(data: LocksData, unit: Entity): Chest | null {
	return chestsAt(data, unit)[0] ?? null;
}

/**
 * Where a lock sits in the tile map: the topmost layer that draws anything on
 * its tile, and the frame found there - the shut look the map authored. Null
 * when the tile is off the map or every layer leaves it empty.
 */
export function findLockTile(tilemap: TileMapData, lock: Door | Chest): LockTileData | null {
	const top = TileMapComponent.topFrameAt(tilemap, lock.column, lock.row);

	return top === null ? null : { lockId: lock.id, layer: top.layer, cell: top.cell, closedFrame: top.frame };
}
