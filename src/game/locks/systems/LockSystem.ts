import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { LocksComponent, LocksData, LockTileData } from "@/game/locks/components/LocksComponent";
import { Chest, Door } from "@/game/locks/model/Locks";
import { TileMapData } from "@/game/map/components/TileMapComponent";
import { EMPTY_TILE } from "@/game/map/model/TileMapFormat";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { keyIndex } from "@/game/units/model/Inventory";
import { LockKind, UnitData, UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Pure lookups over the map's locks, kept off the component the same way
 * `VisitSystem` keeps its lookups off the houses: everything here works on the
 * data a caller already holds, so a feature, a system or a test can call it
 * directly.
 *
 * A door is opened from beside it - the door tile is a wall until it opens, so
 * nobody can stand on it. A chest is opened from on top of it, Fire Emblem's
 * stance, or from beside it, so the two commands read the same way to the
 * player. Either way the unit needs the matching key in its pack; a thief
 * class that picks locks without one would slot in at {@link canUnlock}.
 */
export class LockSystem {
	/** The entity carrying the map's locks, or null when no map is up. */
	public static inWorld(world: World): Entity | null {
		return world.getEntities().find((entity) => entity.hasComponent(LocksComponent)) ?? null;
	}

	/** Whether this lock has already been opened. */
	public static isOpened(data: LocksData, lockId: string): boolean {
		return data.opened.includes(lockId);
	}

	/** The doors still shut. */
	public static closedDoors(data: LocksData): Door[] {
		return data.doors.filter((door) => !LockSystem.isOpened(data, door.id));
	}

	/** The chests still shut. */
	public static closedChests(data: LocksData): Chest[] {
		return data.chests.filter((chest) => !LockSystem.isOpened(data, chest.id));
	}

	/** Whether the unit carries what opens a lock of this kind. Only the player's own units ever turn a key. */
	public static canUnlock(unit: UnitData, kind: LockKind): boolean {
		return unit.faction === UnitFaction.PLAYER && keyIndex(unit, kind) >= 0;
	}

	/**
	 * Every shut door `unit` could open: the ones on a tile orthogonally next to
	 * it, provided it carries a door key. In the order the scenario listed them.
	 */
	public static doorsBeside(data: LocksData, unit: Entity): Door[] {
		if (!LockSystem.canUnlock(unit.getComponent(UnitComponent).read(), LockKind.DOOR)) {
			return [];
		}

		const tile = UnitSystem.tileOf(unit);

		return LockSystem.closedDoors(data).filter((door) => Math.abs(door.column - tile.column) + Math.abs(door.row - tile.row) === 1);
	}

	/**
	 * The door `unit` would open - the first one beside it. Doors on the shipped
	 * map stand well apart, so a unit is never beside two; if a scenario ever puts
	 * two on one corner, this is where a "which one?" step would go, and
	 * `doorsBeside` is what it would ask.
	 */
	public static doorBeside(data: LocksData, unit: Entity): Door | null {
		return LockSystem.doorsBeside(data, unit)[0] ?? null;
	}

	/**
	 * Every shut chest `unit` could open: the one under it, and any on a tile
	 * orthogonally next to it, provided it carries a chest key. The one under it
	 * comes first, the rest in the order the scenario listed them.
	 */
	public static chestsAt(data: LocksData, unit: Entity): Chest[] {
		if (!LockSystem.canUnlock(unit.getComponent(UnitComponent).read(), LockKind.CHEST)) {
			return [];
		}

		const tile = UnitSystem.tileOf(unit);

		return LockSystem.closedChests(data)
			.map((chest) => ({ chest, distance: Math.abs(chest.column - tile.column) + Math.abs(chest.row - tile.row) }))
			.filter(({ distance }) => distance <= 1)
			.sort((first, second) => first.distance - second.distance)
			.map(({ chest }) => chest);
	}

	/** The shut chest `unit` would open - the one it stands on, else the first beside it - or null. */
	public static chestAt(data: LocksData, unit: Entity): Chest | null {
		return LockSystem.chestsAt(data, unit)[0] ?? null;
	}

	/**
	 * Where a lock sits in the tile map: the topmost layer that draws anything on
	 * its tile, and the frame found there - the shut look the map authored. Null
	 * when the tile is off the map or every layer leaves it empty.
	 */
	public static findTile(tilemap: TileMapData, lock: Door | Chest): LockTileData | null {
		if (lock.column < 0 || lock.column >= tilemap.columns || lock.row < 0 || lock.row >= tilemap.rows) {
			return null;
		}

		const cell = lock.row * tilemap.columns + lock.column;

		for (let layer = tilemap.layers.length - 1; layer >= 0; layer--) {
			const frame = tilemap.layers[layer].tiles[cell];

			if (frame > EMPTY_TILE) {
				return { lockId: lock.id, layer, cell, closedFrame: frame };
			}
		}

		return null;
	}

	/**
	 * The tile map with `frame` put in the lock's cell. A fresh object rather
	 * than an edit in place - the component owns its data and takes the new one
	 * through `update`, and only the one layer that changed is rebuilt.
	 */
	public static withFrame(tilemap: TileMapData, tile: LockTileData, frame: number): TileMapData {
		const layers = tilemap.layers.map((layer, index) => {
			if (index !== tile.layer || layer.tiles[tile.cell] === frame) {
				return layer;
			}

			const tiles = [...layer.tiles];
			tiles[tile.cell] = frame;

			return { ...layer, tiles };
		});

		return { ...tilemap, layers };
	}
}
