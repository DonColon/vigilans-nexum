import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { TileMapData } from "@/game/map/components/TileMapComponent";
import { EMPTY_TILE } from "@/game/map/model/TileMapFormat";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { HouseDoorData, VisitComponent, VisitData } from "@/game/visit/components/VisitComponent";
import { House } from "@/game/visit/model/Houses";

/**
 * Pure lookups over the map's houses, kept off the component the same way
 * `TalkSystem` keeps its lookups off the conversations: everything here works
 * on the data a caller already holds, so a feature, a system or a test can call
 * it directly.
 *
 * A unit knocks from the doorstep: the house is asked about the tiles *next to*
 * where it ended its move, not the tile under it, so the doorway itself stays
 * clear and the unit is visibly standing outside the house it is calling at.
 */
export class VisitSystem {
	/** The entity carrying the map's houses, or null when no map is up. */
	public static inWorld(world: World): Entity | null {
		return world.getEntities().find((entity) => entity.hasComponent(VisitComponent)) ?? null;
	}

	/** Whether this house has already been called on. */
	public static isVisited(data: VisitData, houseId: string): boolean {
		return data.visited.includes(houseId);
	}

	/** The houses still worth a knock - the ones whose doors stand open. */
	public static remaining(data: VisitData): House[] {
		return data.houses.filter((house) => !VisitSystem.isVisited(data, house.id));
	}

	/**
	 * Every house `unit` could call on: the ones whose door is on a tile
	 * orthogonally next to it and that nobody has been in yet. A unit knocks from
	 * the doorstep, not from inside the doorway - it walks *up to* the house the
	 * way it walks up to an ally to trade, and the door tile itself is left for
	 * the villager. Only the player's own units ever knock; an enemy passing a
	 * house is just passing a house.
	 */
	public static availableAll(data: VisitData, unit: Entity): House[] {
		if (unit.getComponent(UnitComponent).read().faction !== UnitFaction.PLAYER) {
			return [];
		}

		const tile = UnitSystem.tileOf(unit);

		return VisitSystem.remaining(data).filter((house) => Math.abs(house.column - tile.column) + Math.abs(house.row - tile.row) === 1);
	}

	/**
	 * The house `unit` would call on - the first one beside it, in the order the
	 * scenario listed them. Houses on the shipped map stand well apart, so a unit
	 * is never beside two; if a scenario ever puts two doors on the same corner,
	 * this is where a "which one?" step would go, and `availableAll` is what it
	 * would ask.
	 */
	public static available(data: VisitData, unit: Entity): House | null {
		return VisitSystem.availableAll(data, unit)[0] ?? null;
	}

	/**
	 * Where a house's door sits in the tile map: the topmost layer that draws
	 * anything on its tile, and the frame found there - the shut door the map
	 * authored, which is what the house goes back to once it has been visited.
	 * Null when the tile is off the map or every layer leaves it empty.
	 */
	public static findDoor(tilemap: TileMapData, house: House): HouseDoorData | null {
		if (house.column < 0 || house.column >= tilemap.columns || house.row < 0 || house.row >= tilemap.rows) {
			return null;
		}

		const cell = house.row * tilemap.columns + house.column;

		for (let layer = tilemap.layers.length - 1; layer >= 0; layer--) {
			const frame = tilemap.layers[layer].tiles[cell];

			if (frame > EMPTY_TILE) {
				return { houseId: house.id, layer, cell, closedDoor: frame };
			}
		}

		return null;
	}

	/**
	 * The tile map with `frame` put in the door's cell. A fresh object rather
	 * than an edit in place - the component owns its data and takes the new one
	 * through `update`, and only the one layer that changed is rebuilt.
	 */
	public static withDoor(tilemap: TileMapData, door: HouseDoorData, frame: number): TileMapData {
		const layers = tilemap.layers.map((layer, index) => {
			if (index !== door.layer || layer.tiles[door.cell] === frame) {
				return layer;
			}

			const tiles = [...layer.tiles];
			tiles[door.cell] = frame;

			return { ...layer, tiles };
		});

		return { ...tilemap, layers };
	}
}
