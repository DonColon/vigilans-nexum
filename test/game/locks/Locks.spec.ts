import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { i18n } from "@/core/i18n/I18n";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { ChestOpenedEvent, DoorOpenedEvent, LockCancelledEvent } from "@/game.events";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ConvoyFeature } from "@/game/convoy/ConvoyFeature";
import { ConvoySystem } from "@/game/convoy/systems/ConvoySystem";
import { LocksComponent } from "@/game/locks/components/LocksComponent";
import { LocksFeature } from "@/game/locks/LocksFeature";
import { chestPopup, LocksDocument, parseLocks } from "@/game/locks/model/Locks";
import { LockSystem } from "@/game/locks/systems/LockSystem";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { TileMapComponent, TileMapData } from "@/game/map/components/TileMapComponent";
import { Terrain, isPassable } from "@/game/map/model/Terrain";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { parseTileMapDocument, TileMapDocument } from "@/game/map/model/TileMapFormat";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitMenuRow } from "@/game/movement/model/UnitMenus";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { PopupState } from "@/game/ui/states/PopupState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import skirmishLocks from "@/assets/data/locks/skirmish.locks.json";
import fantasyMap from "@/assets/data/maps/fantasy.tilemap.json";

/** The kenney-1bit frames the locks are drawn with: a shut and an open door, a shut and an open chest. */
const CLOSED_DOOR = 550;
const OPEN_DOOR = 551;
const CLOSED_CHEST = 304;
const OPEN_CHEST = 305;

suite("Scenario Lock Sheet Test Suite", () => {
	const document = fantasyMap as unknown as TileMapDocument;
	const parsed = parseTileMapDocument(document);
	const frameAt = (column: number, row: number) => parsed.layers[0].tiles[row * parsed.columns + column];
	const terrainAt = (column: number, row: number) => parsed.terrain[row * parsed.columns + column];
	const sheet = parseLocks(skirmishLocks as LocksDocument);

	test("The shipped sheet locks the fort behind one door, with one chest inside", () => {
		expect(sheet.doors.map((door) => door.id)).toStrictEqual(["fort-gate"]);
		expect(sheet.chests.map((chest) => chest.id)).toStrictEqual(["fort-chest"]);
		expect(sheet.chests[0].reward).toBe("energy-drop");
	});

	test("Every shipped door is drawn shut on the map, blocks the way, and has a tile to open it from", () => {
		for (const door of sheet.doors) {
			expect(frameAt(door.column, door.row), `door "${door.id}"`).toBe(CLOSED_DOOR);
			expect(terrainAt(door.column, door.row), `door "${door.id}"`).toBe(Terrain.WALL);
			expect(door.openFrame).toBe(OPEN_DOOR);
			expect(document.tileTerrain?.[String(door.openFrame)] ?? "plain").toBe(Terrain.PLAIN);

			const doorstep = [
				[door.column - 1, door.row],
				[door.column + 1, door.row],
				[door.column, door.row - 1],
				[door.column, door.row + 1]
			].filter(([column, row]) => column >= 0 && row >= 0 && column < parsed.columns && row < parsed.rows && isPassable(terrainAt(column, row)));

			// A door nobody can stand beside can never be opened - and once it is
			// open, there has to be somewhere on the far side to walk into.
			expect(doorstep.length, `door "${door.id}"`).toBeGreaterThan(1);
		}
	});

	test("Every shipped chest is drawn shut on ground a unit can stand on, and holds something the catalogs know", () => {
		const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);
		const known = new Set([
			...Object.keys(assets.getJson<{ weapons: Record<string, unknown> }>("catalog-weapons").weapons),
			...Object.keys(assets.getJson<{ items: Record<string, unknown> }>("catalog-items").items)
		]);

		for (const chest of sheet.chests) {
			expect(frameAt(chest.column, chest.row), `chest "${chest.id}"`).toBe(CLOSED_CHEST);
			expect(isPassable(terrainAt(chest.column, chest.row)), `chest "${chest.id}"`).toBe(true);
			expect(chest.openFrame).toBe(OPEN_CHEST);

			if (chest.reward.length > 0) {
				expect(known, `chest "${chest.id}"`).toContain(chest.reward);
			}
		}
	});

	test("The fort is sealed until the gate opens - its chest is only reachable through the door", () => {
		const grid = GridSystem.fromTileMap(parsed, 24);
		const [gate] = sheet.doors;
		const [chest] = sheet.chests;
		const outside = { column: gate.column, row: gate.row + 1 };

		// Even with the run of the whole map, the shut gate keeps the chest out of reach.
		const sealed = MovementSystem.reachable(grid, outside, 999);
		expect(sealed.some((tile) => tile.column === chest.column && tile.row === chest.row)).toBe(false);

		const opened = { ...grid, tiles: grid.tiles.map((terrain, cell) => (cell === gate.row * grid.columns + gate.column ? Terrain.PLAIN : terrain)) };
		const unsealed = MovementSystem.reachable(opened, outside, 999);
		expect(unsealed.some((tile) => tile.column === chest.column && tile.row === chest.row)).toBe(true);
	});

	test("A malformed sheet is rejected", () => {
		const base = { format: "vigilans-locks", version: 1, doors: [], chests: [] } as unknown as LocksDocument;
		const door = { id: "d", column: 1, row: 1, openFrame: 551 };

		expect(() => parseLocks({ ...base, format: "something-else" } as unknown as LocksDocument)).toThrow(/expected "vigilans-locks"/);
		expect(() => parseLocks({ ...base, version: 2 } as unknown as LocksDocument)).toThrow(/version 2/);
		expect(() => parseLocks({ ...base, doors: undefined } as unknown as LocksDocument)).toThrow(/missing its doors/);
		expect(() => parseLocks({ ...base, doors: [{ ...door, id: "" }] })).toThrow(/missing its id/);
		expect(() => parseLocks({ ...base, doors: [door, { ...door, column: 2 }] })).toThrow(/defined twice/);
		expect(() => parseLocks({ ...base, doors: [door], chests: [{ ...door, id: "c" }] })).toThrow(/another lock already claims/);
		expect(() => parseLocks({ ...base, doors: [{ ...door, column: -1 }] })).toThrow(/not a tile coordinate/);
		expect(() => parseLocks({ ...base, doors: [{ ...door, openFrame: -1 }] })).toThrow(/frame it shows once open/);
	});

	test("The chest notice names the find, where it went, or that there was nothing", () => {
		const [chest] = sheet.chests;

		expect(chestPopup(chest, "Teuta", "energy-drop", "")).toStrictEqual({
			id: "chest-fort-chest",
			title: i18n("chest.obtained"),
			lines: [i18n("chest.received", { unit: "Teuta", item: "Energy Drop" })]
		});
		expect(chestPopup(chest, "Teuta", "energy-drop", "vulnerary").lines).toStrictEqual([
			i18n("chest.received", { unit: "Teuta", item: "Energy Drop" }),
			i18n("chest.stored", { item: "Vulnerary" })
		]);
		expect(chestPopup(chest, "Teuta", "energy-drop", "energy-drop").lines).toStrictEqual([i18n("chest.stored", { item: "Energy Drop" })]);
		expect(chestPopup(chest, "Teuta", "", "").lines).toStrictEqual([i18n("chest.empty")]);
	});
});

/**
 * Doors and chests end to end: Teuta carries the keys, so beside the shut door
 * her command menu offers "Door" and on or beside the chest it offers "Chest". Opening the
 * door swaps the tile and lets units through; opening the chest hands over what
 * was inside and shows the notice. Either spends her turn and her key.
 *
 * The test map walls off row 12 with a door in it at 4,12 and puts a chest on
 * 4,13, on the far side. The deployment puts Teuta on 5,11, a step from the
 * doorstep at 4,11.
 */
suite("Unit Locks Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(TileMapComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("unit-locks-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const COLUMNS = 8;
	const ROWS = 16;
	const DOOR = { column: 4, row: 12 };
	const DOORSTEP = { column: 4, row: 11 };
	const CHEST = { column: 4, row: 13 };

	const sketch = new Array(ROWS).fill(".".repeat(COLUMNS));
	sketch[DOOR.row] = "#".repeat(COLUMNS);

	const shipped = assets.getJson<LocksDocument>("locks-skirmish");

	/** The scenario sheet the feature reads, with the locks put where Teuta can reach them. */
	const lockSheet = (chestOverrides: Record<string, unknown> = {}): LocksDocument => ({
		format: "vigilans-locks",
		version: 1,
		doors: [{ id: "gate", column: DOOR.column, row: DOOR.row, openFrame: OPEN_DOOR }],
		chests: [{ id: "strongbox", column: CHEST.column, row: CHEST.row, openFrame: OPEN_CHEST, reward: "energy-drop", ...chestOverrides }]
	});

	let units: UnitsFeature;
	let ui: UIFeature;
	let convoy: ConvoyFeature;
	let locks: LocksFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const sheet = (id: string) => unit(id).getComponent(UnitComponent).read();
	const pack = (id: string) => sheet(id).inventory.map((entry) => entry.id);

	const state = () => (LockSystem.inWorld(world) as Entity).getComponent(LocksComponent).read();
	const convoyItems = () =>
		(ConvoySystem.inWorld(world) as Entity)
			.getComponent(ConvoyComponent)
			.read()
			.items.map((entry) => entry.id);
	const menu = () => {
		const top = stateManager.peek();

		return top instanceof MenuState ? top.getMenu()?.getComponent(MenuComponent).read() : undefined;
	};
	const popup = () => stateManager.getState(PopupState).getPopup()?.getComponent(PopupComponent) ?? null;

	const grid = () => map.getComponent(GridComponent).read();
	const tilemap = () => map.getComponent(TileMapComponent).read();
	const frameAt = (tile: { column: number; row: number }) => tilemap().layers[0].tiles[tile.row * COLUMNS + tile.column];
	const terrainAt = (tile: { column: number; row: number }) => grid().tiles[tile.row * COLUMNS + tile.column];

	/** An all-plain tile map with the wall row drawn, a shut door in it and a shut chest beyond. */
	const tileMapData = (): TileMapData => {
		const tiles = new Array(COLUMNS * ROWS).fill(0);

		for (let column = 0; column < COLUMNS; column++) {
			tiles[DOOR.row * COLUMNS + column] = 637;
		}

		tiles[DOOR.row * COLUMNS + DOOR.column] = CLOSED_DOOR;
		tiles[CHEST.row * COLUMNS + CHEST.column] = CLOSED_CHEST;

		return {
			tileset: "kenney-1bit",
			tileWidth: 16,
			tileHeight: 16,
			columns: COLUMNS,
			rows: ROWS,
			background: "",
			layers: [{ name: "terrain", tiles, flips: new Array(COLUMNS * ROWS).fill(0) }]
		};
	};

	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(10_000);
		eventSystem.processQueue();
		walkSystem.dispose();
	};

	/** Picks Teuta up and sets her down on a tile, leaving her command menu open. */
	const moveTo = (column: number, row: number) => {
		eventSystem.dispatch("map:tileConfirmed", { column: 5, row: 11, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		finishWalk();
	};

	/** Chooses a row of the open command menu. */
	const choose = (row: string) => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", row, index: 0, item: row });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver door:requested / chest:requested
		eventSystem.processQueue(); // deliver door:opened / convoy:requested
		eventSystem.processQueue(); // deliver unit:acted / convoy:delivered
	};

	/** Acknowledges the notice, the way the dismiss command would. */
	const closePopup = () => {
		const component = popup() as PopupComponent;

		component.update({ ...component.read(), closed: true });
		eventSystem.dispatch("ui:popupClosed", { popup: component.read().id });
		stateManager.pop();
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver chest:opened
		eventSystem.processQueue(); // deliver unit:acted
	};

	/** Builds the map and installs the features, with `document` as the scenario's locks. */
	const start = (document: LocksDocument = lockSheet()) => {
		assets.setJson("locks-skirmish", document);

		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(sketch), 24));
		map.addComponent(TileMapComponent, tileMapData());
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 5, row: 11 });

		units = new UnitsFeature();
		units.install();
		ui = new UIFeature({ demo: false });
		ui.install();
		convoy = new ConvoyFeature({ dependencies: [units, ui] });
		convoy.install();
		locks = new LocksFeature({ dependencies: [units, convoy] });
		locks.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: COLUMNS, rows: ROWS });
		eventSystem.processQueue();
	};

	/** Opens the gate the quick way - in the grid and on the lock sheet - so a chest test can start on the far side. */
	const openGate = () => {
		const component = map.getComponent(GridComponent);
		const data = component.read();
		component.update({ ...data, tiles: data.tiles.map((terrain, cell) => (cell === DOOR.row * COLUMNS + DOOR.column ? Terrain.PLAIN : terrain)) });

		const locksComponent = (LockSystem.inWorld(world) as Entity).getComponent(LocksComponent);
		locksComponent.update({ ...locksComponent.read(), opened: ["gate"] });
	};

	beforeEach(() => {
		stateManager.clear();
	});

	afterEach(() => {
		movement.uninstall();
		locks.uninstall();
		convoy.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		assets.setJson("locks-skirmish", shipped);
		eventSystem.processQueue();
	});

	suite("Doors", () => {
		test("map:ready reads the scenario's locks and finds them on the map, all still shut", () => {
			start();

			expect(state().doors.map((door) => door.id)).toStrictEqual(["gate"]);
			expect(state().chests.map((chest) => chest.id)).toStrictEqual(["strongbox"]);
			expect(state().opened).toStrictEqual([]);
			expect(state().tiles).toStrictEqual([
				{ lockId: "gate", layer: 0, cell: DOOR.row * COLUMNS + DOOR.column, closedFrame: CLOSED_DOOR },
				{ lockId: "strongbox", layer: 0, cell: CHEST.row * COLUMNS + CHEST.column, closedFrame: CLOSED_CHEST }
			]);
			expect(frameAt(DOOR)).toBe(CLOSED_DOOR);
			expect(terrainAt(DOOR)).toBe(Terrain.WALL);
		});

		test("The command menu offers Door on the doorstep to a unit with a door key", () => {
			start();
			moveTo(DOORSTEP.column, DOORSTEP.row);

			expect(menu()?.items).toStrictEqual([i18n("menu.door"), i18n("menu.items"), i18n("menu.trade"), i18n("menu.wait")]);
		});

		test("Door is left out a tile away from the door, and for a unit without a key", () => {
			start();
			moveTo(5, 12 - 1); // beside the wall, not the door

			expect(menu()?.items).not.toContain(i18n("menu.door"));

			eventSystem.dispatch("ui:menuCancelled", { menu: "unit-command" });
			eventSystem.processQueue();
			eventSystem.dispatch("map:cancelled", {});
			eventSystem.processQueue();

			// Elira on the doorstep has no key.
			eventSystem.dispatch("map:tileConfirmed", { column: 5, row: 10, terrain: "plain" });
			eventSystem.processQueue();
			eventSystem.dispatch("map:tileConfirmed", { column: DOORSTEP.column, row: DOORSTEP.row, terrain: "plain" });
			eventSystem.processQueue();
			finishWalk();

			expect(menu()?.items).not.toContain(i18n("menu.door"));
		});

		test("Choosing Door opens it on the map and in the grid, spends the key and the turn", () => {
			const opened: DoorOpenedEvent[] = [];
			let acted: string | null = null;
			eventSystem.subscribe("door:opened", (event) => opened.push(event));
			eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

			start();
			moveTo(DOORSTEP.column, DOORSTEP.row);
			choose(UnitMenuRow.DOOR);

			expect(opened).toMatchObject([{ unitId: "teuta", doorId: "gate" }]);
			expect(frameAt(DOOR)).toBe(OPEN_DOOR);
			expect(terrainAt(DOOR)).toBe(Terrain.PLAIN);
			expect(state().opened).toStrictEqual(["gate"]);

			// The one-use key is gone; the chest key is still there.
			expect(pack("teuta")).toStrictEqual(["heal", "chest-key"]);

			expect(sheet("teuta").hasMoved).toBe(true);
			expect(unit("teuta").hasComponent(PendingMoveComponent)).toBe(false);
			expect(acted).toBe("teuta");
			expect(stateManager.peek()).not.toBeInstanceOf(MenuState);

			// And the way through is open: the far side is in reach from the doorstep now.
			const reachable = MovementSystem.reachable(grid(), DOORSTEP, 5);
			expect(reachable.some((tile) => tile.row > DOOR.row)).toBe(true);
		});

		test("An opened door stays open - it is not offered again", () => {
			start();
			moveTo(DOORSTEP.column, DOORSTEP.row);
			choose(UnitMenuRow.DOOR);

			// Give her another key and a fresh turn; the gate is no longer a lock to open.
			const component = unit("teuta").getComponent(UnitComponent);
			component.update({ ...component.read(), hasMoved: false, inventory: [...component.read().inventory, sheet("dardan").inventory[0]] });

			eventSystem.dispatch("map:tileConfirmed", { column: DOORSTEP.column, row: DOORSTEP.row, terrain: "plain" });
			eventSystem.processQueue();
			eventSystem.dispatch("map:tileConfirmed", { column: DOORSTEP.column, row: DOORSTEP.row, terrain: "plain" });
			eventSystem.processQueue();
			finishWalk();

			expect(menu()?.items).not.toContain(i18n("menu.door"));
		});

		test("A request for a door the unit is not beside is cancelled, and the menu comes back", () => {
			const cancelled: LockCancelledEvent[] = [];
			eventSystem.subscribe("lock:cancelled", (event) => cancelled.push(event));

			start();
			moveTo(5, 11);

			eventSystem.dispatch("door:requested", { unitId: "teuta", doorId: "gate" });
			eventSystem.processQueue();
			eventSystem.processQueue();

			expect(cancelled).toMatchObject([{ unitId: "teuta" }]);
			expect(frameAt(DOOR)).toBe(CLOSED_DOOR);
			expect(pack("teuta")).toContain("door-key");
			expect(menu()?.id).toBe("unit-command");
			expect(sheet("teuta").hasMoved).toBe(false);
		});
	});

	suite("Chests", () => {
		test("The command menu offers Chest on the chest to a unit with a chest key", () => {
			start();
			openGate();
			moveTo(CHEST.column, CHEST.row);

			expect(menu()?.items).toStrictEqual([i18n("menu.chest"), i18n("menu.items"), i18n("menu.wait")]);
		});

		test("Chest is offered beside the chest too, but not a tile further off", () => {
			start();
			openGate();
			moveTo(CHEST.column + 1, CHEST.row);

			expect(menu()?.items).toContain(i18n("menu.chest"));

			eventSystem.dispatch("ui:menuCancelled", { menu: "unit-command" });
			eventSystem.processQueue();
			eventSystem.dispatch("map:cancelled", {});
			eventSystem.processQueue();

			moveTo(CHEST.column + 2, CHEST.row);

			expect(menu()?.items).not.toContain(i18n("menu.chest"));
		});

		test("Choosing Chest opens it, hands over the find, and spends the key and the turn once the notice is read", () => {
			const opened: ChestOpenedEvent[] = [];
			let acted: string | null = null;
			eventSystem.subscribe("chest:opened", (event) => opened.push(event));
			eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

			start();
			openGate();
			moveTo(CHEST.column, CHEST.row);
			choose(UnitMenuRow.CHEST);

			expect(frameAt(CHEST)).toBe(OPEN_CHEST);
			expect(state().opened).toStrictEqual(["gate", "strongbox"]);

			// The notice is up, naming the find; the unit is not spent until it is read.
			expect(stateManager.peek()).toBeInstanceOf(PopupState);
			expect(popup()?.read()).toMatchObject({ id: "chest-strongbox", title: i18n("chest.obtained"), lines: [i18n("chest.received", { unit: sheet("teuta").name, item: "Energy Drop" })] });
			expect(opened).toStrictEqual([]);
			expect(sheet("teuta").hasMoved).toBe(false);

			closePopup();

			expect(opened).toMatchObject([{ unitId: "teuta", chestId: "strongbox", itemId: "energy-drop" }]);
			expect(pack("teuta")).toStrictEqual(["heal", "door-key", "energy-drop"]);
			expect(sheet("teuta").hasMoved).toBe(true);
			expect(acted).toBe("teuta");
			expect(convoyItems()).toStrictEqual([]);
		});

		test("A bare chest still opens, says so, and spends the turn", () => {
			start(lockSheet({ reward: undefined }));
			openGate();
			moveTo(CHEST.column, CHEST.row);
			choose(UnitMenuRow.CHEST);

			expect(popup()?.read().lines).toStrictEqual([i18n("chest.empty")]);

			closePopup();

			expect(pack("teuta")).toStrictEqual(["heal", "door-key"]);
			expect(sheet("teuta").hasMoved).toBe(true);
		});
	});
});
