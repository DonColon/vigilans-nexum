import { Entity } from "@/core/ecs/Entity";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { TileMapComponent, TileMapData } from "@/game/map/components/TileMapComponent";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { tileOf } from "@/game/units/rules/UnitLookup";
import { HouseDoorData, VisitComponent, VisitData } from "@/game/visit/components/VisitComponent";
import { House } from "@/game/visit/content/Houses";

/*
 * Who can knock where: the map's houses held against the unit on the doorstep
 * and the tile map their doors are drawn on. Everything here works on the data
 * a caller already holds, so a feature, a system or a test can call it directly.
 *
 * A unit knocks from the doorstep: the house is asked about the tiles *next to*
 * where it ended its move, not the tile under it, so the doorway itself stays
 * clear and the unit is visibly standing outside the house it is calling at.
 */

/**
 * Every house `unit` could call on: the ones whose door is on a tile
 * orthogonally next to it and that nobody has been in yet. A unit knocks from
 * the doorstep, not from inside the doorway - it walks *up to* the house the
 * way it walks up to an ally to trade, and the door tile itself is left for
 * the villager. Only the player's own units ever knock; an enemy passing a
 * house is just passing a house.
 */
export function availableHouses(data: VisitData, unit: Entity): House[] {
	if (unit.getComponent(UnitComponent).read().faction !== UnitFaction.PLAYER) {
		return [];
	}

	const tile = tileOf(unit);

	return VisitComponent.remaining(data).filter((house) => GridPositionComponent.distance(house, tile) === 1);
}

/**
 * The house `unit` would call on - the first one beside it, in the order the
 * scenario listed them. Houses on the shipped map stand well apart, so a unit
 * is never beside two; if a scenario ever puts two doors on the same corner,
 * this is where a "which one?" step would go, and `availableHouses` is what it
 * would ask.
 */
export function availableHouse(data: VisitData, unit: Entity): House | null {
	return availableHouses(data, unit)[0] ?? null;
}

/**
 * Where a house's door sits in the tile map: the topmost layer that draws
 * anything on its tile, and the frame found there - the shut door the map
 * authored, which is what the house goes back to once it has been visited.
 * Null when the tile is off the map or every layer leaves it empty.
 */
export function findDoor(tilemap: TileMapData, house: House): HouseDoorData | null {
	const top = TileMapComponent.topFrameAt(tilemap, house.column, house.row);

	return top === null ? null : { houseId: house.id, layer: top.layer, cell: top.cell, closedDoor: top.frame };
}
