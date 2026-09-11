import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChestRequestedEvent, ConvoyDeliveredEvent, DoorRequestedEvent, PopupClosedEvent } from "@/game.events";
import { LocksComponent, LocksData, LockTileData } from "@/game/locks/components/LocksComponent";
import { Chest, chestPopup, Door, LocksDocument, parseLocks } from "@/game/locks/model/Locks";
import { LockSystem } from "@/game/locks/systems/LockSystem";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { GridComponent } from "@/game/map/components/GridComponent";
import { TileMapComponent } from "@/game/map/components/TileMapComponent";
import { Terrain } from "@/game/map/model/Terrain";
import { PopupState } from "@/game/ui/states/PopupState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { keyIndex, spendInventoryUse } from "@/game/units/model/Inventory";
import { LockKind } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/** Asset id of the lock sheet this battle is scripted with. */
const LOCKS_ASSET = "locks-skirmish";

/**
 * Fire Emblem's "Door" and "Chest": the locked doors and chests on the map, and
 * the keys that open them.
 *
 *  - On `map:ready` the scenario's lock sheet is read out of the asset bundle
 *    onto a [[LocksComponent]] and every lock is found in the tile map. The map
 *    already draws each one shut, so nothing changes on screen until a key is
 *    turned.
 *  - A door is opened from beside it, the way a house is visited: a shut door
 *    is a wall, so nobody can stand on it. The [[MovementFeature]] asks
 *    [[LockSystem]] whether the unit stands beside one and carries a door key,
 *    and only then offers the command. `door:requested` swaps the tile for its
 *    open frame, makes the tile plain ground in the grid so units can walk
 *    through, spends the key and reports `door:opened` - which is the unit's
 *    action for the turn.
 *  - A chest is opened from on top of it or from beside it, with a chest key.
 *    `chest:requested` swaps the tile, spends the key and hands over what was
 *    inside through
 *    `convoy:requested`, so a unit with a full pack keeps the find on the
 *    baggage train rather than losing it. A notice then names what was found
 *    ([[PopupState]]); once acknowledged, `chest:opened` spends the unit.
 *  - A request for a lock the unit turns out not to be at reports
 *    `lock:cancelled`, which puts the command menu back.
 *
 * With no convoy feature installed there is nothing listening for the request,
 * so a chest with something in it is never reported opened. The two ship
 * together - see `src/index.ts`.
 *
 * Where the locks are and what the chests hold is content, not code - see
 * `src/assets/data/locks`.
 */
export class LocksFeature extends BattleMapFeature {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	private locks: Entity | null = null;

	/** The find being handed over right now, so the notice can be raised once the convoy has answered. */
	private handing: { chestId: string; unitId: string } | null = null;

	/** The notice on screen right now, so the chest can be reported once it is acknowledged. */
	private showing: { chestId: string; unitId: string; itemId: string } | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({ components: [LocksComponent], ...config });
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("door:requested", (event) => this.onDoorRequested(event));
		this.subscribe("chest:requested", (event) => this.onChestRequested(event));
		this.subscribe("convoy:delivered", (event) => this.onDelivered(event));
		this.subscribe("ui:popupClosed", (event) => this.onPopupClosed(event));
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.close();
	}

	/** Reads the scenario's locks and finds each one in the tile map. */
	private open(): void {
		this.close();

		const { doors, chests } = this.sheet();

		this.locks = this.world.createEntity();
		this.locks.addComponent(LocksComponent, { doors, chests, opened: [], tiles: [] });

		const tilemap = this.tilemap();

		if (tilemap === null) {
			return;
		}

		const map = tilemap.read();
		const tiles: LockTileData[] = [];

		for (const lock of [...doors, ...chests]) {
			const tile = LockSystem.findTile(map, lock);

			if (tile === null) {
				console.warn(`Lock "${lock.id}" sits on tile ${lock.column},${lock.row}, where the map draws nothing`);
				continue;
			}

			tiles.push(tile);
		}

		this.locks.getComponent(LocksComponent).update({ doors, chests, opened: [], tiles });
	}

	private close(): void {
		this.handing = null;
		this.showing = null;

		if (this.locks) {
			this.world.unregisterEntity(this.locks);
			this.locks = null;
		}
	}

	/** The scenario's lock sheet, or none at all when it is not in the bundle. */
	private sheet(): { doors: Door[]; chests: Chest[] } {
		try {
			return parseLocks(this.assets.getJson<LocksDocument>(LOCKS_ASSET));
		} catch (error) {
			console.error(`Lock sheet "${LOCKS_ASSET}" could not be read:`, error);
			return { doors: [], chests: [] };
		}
	}

	/**
	 * "Door" was chosen: the door swings open on the map and in the grid, the key
	 * is spent. There is nothing to show beyond the tile changing - the wall the
	 * unit could not pass is now a doorway it can.
	 */
	private onDoorRequested(event: DoorRequestedEvent): void {
		const unit = UnitSystem.byId(this.units(), event.unitId);
		const door = unit === null ? null : LockSystem.doorBeside(this.read(), unit);

		// The command menu is already gone; without a door to open, say so, so the
		// unit is not left standing there with nothing on screen.
		if (unit === null || door === null || door.id !== event.doorId) {
			this.events.dispatch("lock:cancelled", { unitId: event.unitId });
			return;
		}

		this.unlock(unit, door, LockKind.DOOR);
		this.clearTerrain(door);

		this.events.dispatch("door:opened", { unitId: event.unitId, doorId: door.id });
	}

	/**
	 * "Chest" was chosen: the lid comes up on the map, the key is spent, and what
	 * was inside is handed over. The find is not written into the pack here. It
	 * is asked for through `convoy:requested`, so a unit with no room left gets
	 * the convoy's answer instead of losing it, and the notice that follows can
	 * say where it ended up.
	 */
	private onChestRequested(event: ChestRequestedEvent): void {
		const unit = UnitSystem.byId(this.units(), event.unitId);
		const chest = unit === null ? null : LockSystem.chestAt(this.read(), unit);

		if (unit === null || chest === null || chest.id !== event.chestId) {
			this.events.dispatch("lock:cancelled", { unitId: event.unitId });
			return;
		}

		this.unlock(unit, chest, LockKind.CHEST);

		if (chest.reward.length === 0) {
			this.notice(chest, event.unitId, "", "");
			return;
		}

		this.handing = { chestId: chest.id, unitId: event.unitId };
		this.events.dispatch("convoy:requested", { unitId: event.unitId, itemId: chest.reward });
	}

	/** Strikes the lock off, swaps its tile for the open frame and takes a charge off the unit's key. */
	private unlock(unit: Entity, lock: Door | Chest, kind: LockKind): void {
		if (this.locks === null) {
			return;
		}

		const component = this.locks.getComponent(LocksComponent);
		const data = component.read();

		component.update({ ...data, opened: [...data.opened, lock.id] });

		const tile = data.tiles.find((entry) => entry.lockId === lock.id);

		if (tile !== undefined) {
			this.swapTile(tile, lock.openFrame);
		}

		const unitComponent = unit.getComponent(UnitComponent);
		const unitData = unitComponent.read();
		const slot = keyIndex(unitData, kind);

		if (slot >= 0) {
			unitComponent.update(spendInventoryUse(unitData, slot));
		}
	}

	/** The find has somewhere to be - a pack slot, or the convoy. Say so. */
	private onDelivered(event: ConvoyDeliveredEvent): void {
		const handing = this.handing;

		if (handing === null || event.unitId !== handing.unitId) {
			return;
		}

		this.handing = null;

		const chest = this.read().chests.find((entry) => entry.id === handing.chestId);

		if (chest === undefined) {
			this.events.dispatch("chest:opened", { unitId: handing.unitId, chestId: handing.chestId, itemId: "" });
			return;
		}

		this.notice(chest, handing.unitId, event.itemId, event.storedId);
	}

	/** Puts up the "you got an item" box; `chest:opened` waits on it being acknowledged. */
	private notice(chest: Chest, unitId: string, itemId: string, storedId: string): void {
		this.showing = { chestId: chest.id, unitId, itemId };

		this.stateManager.getState(PopupState).request(chestPopup(chest, this.nameOf(unitId), itemId, storedId));
		this.stateManager.push(PopupState);
	}

	/** The notice was acknowledged - now the chest is done with. */
	private onPopupClosed(event: PopupClosedEvent): void {
		const showing = this.showing;

		if (showing === null || event.popup !== `chest-${showing.chestId}`) {
			return;
		}

		this.showing = null;

		this.events.dispatch("chest:opened", { unitId: showing.unitId, chestId: showing.chestId, itemId: showing.itemId });
	}

	/** The name on a unit's sheet, for the notice that says what it found. */
	private nameOf(unitId: string): string {
		return UnitSystem.byId(this.units(), unitId)?.getComponent(UnitComponent).read().name ?? unitId;
	}

	/** Writes a frame into the tile map - what the player sees change. */
	private swapTile(tile: LockTileData, frame: number): void {
		const tilemap = this.tilemap();

		if (tilemap === null) {
			return;
		}

		tilemap.update(LockSystem.withFrame(tilemap.read(), tile, frame));
	}

	/** Makes an opened door's tile plain ground in the grid, so the pathfinding walks through it. */
	private clearTerrain(door: Door): void {
		const map = this.map();

		if (map === null || !map.hasComponent(GridComponent)) {
			return;
		}

		const grid = map.getComponent(GridComponent);
		const data = grid.read();
		const cell = door.row * data.columns + door.column;

		if (cell < 0 || cell >= data.tiles.length || data.tiles[cell] === Terrain.PLAIN) {
			return;
		}

		const tiles = [...data.tiles];
		tiles[cell] = Terrain.PLAIN;

		grid.update({ ...data, tiles });
	}

	/** The tile map of the active battle map, or null when there is none on screen. */
	private tilemap(): TileMapComponent | null {
		const map = this.map();

		if (map === null || !map.hasComponent(TileMapComponent)) {
			return null;
		}

		return map.getComponent(TileMapComponent);
	}

	private read(): LocksData {
		if (this.locks === null) {
			return { doors: [], chests: [], opened: [], tiles: [] };
		}

		return this.locks.getComponent(LocksComponent).read();
	}

	private units(): Entity[] {
		return UnitSystem.inWorld(this.world);
	}
}
