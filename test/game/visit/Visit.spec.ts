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
import { VisitFinishedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { TileMapComponent, TileMapData } from "@/game/map/components/TileMapComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { parseTileMapDocument, TileMapDocument } from "@/game/map/model/TileMapFormat";
import { isPassable } from "@/game/map/model/Terrain";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitMenuRow } from "@/game/movement/model/UnitMenus";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { DialogComponent } from "@/game/ui/components/DialogComponent";
import { DialogState } from "@/game/ui/states/DialogState";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { PopupState } from "@/game/ui/states/PopupState";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { INVENTORY_SIZE } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ConvoyFeature } from "@/game/convoy/ConvoyFeature";
import { CONVOY_MENU } from "@/game/convoy/model/ConvoyMenus";
import { ConvoySystem } from "@/game/convoy/systems/ConvoySystem";
import { VisitComponent } from "@/game/visit/components/VisitComponent";
import { VisitSystem } from "@/game/visit/systems/VisitSystem";
import { VisitFeature } from "@/game/visit/VisitFeature";
import skirmishHouses from "@/assets/data/houses/skirmish.houses.json";
import fantasyMap from "@/assets/data/maps/fantasy.tilemap.json";
import { HousesDocument } from "@/game/visit/model/Houses";

/** The closed door the test map draws, and the doorway it opens into. */
const CLOSED_DOOR = 445;
const OPEN_DOOR = 447;

suite("Scenario House Sheet Test Suite", () => {
	const map = fantasyMap as { columns: number; layers: { tiles: number[] }[] };
	const frameAt = (column: number, row: number) => map.layers[0].tiles[row * map.columns + column];

	test("Every shipped house stands on a door the map actually draws", () => {
		for (const house of (skirmishHouses as HousesDocument).houses) {
			const frame = frameAt(house.column, house.row);

			expect(frame, `house "${house.id}"`).toBeGreaterThan(0);
			// The authored frame is the shut door and the sheet names the open one -
			// a house that named the frame already on the map would never change.
			expect(house.openDoor, `house "${house.id}"`).not.toBe(frame);
		}
	});

	test("Every shipped house has a tile a unit could knock from", () => {
		const parsed = parseTileMapDocument(fantasyMap as unknown as TileMapDocument);
		const terrainAt = (column: number, row: number) => parsed.terrain[row * parsed.columns + column];

		for (const house of (skirmishHouses as HousesDocument).houses) {
			const doorstep = [
				[house.column - 1, house.row],
				[house.column + 1, house.row],
				[house.column, house.row - 1],
				[house.column, house.row + 1]
			].filter(([column, row]) => column >= 0 && row >= 0 && column < parsed.columns && row < parsed.rows && isPassable(terrainAt(column, row)));

			// A house nobody can stand beside can never be visited, however good the
			// script is - and now that the knock comes from outside, that is a real
			// authoring mistake rather than a theoretical one.
			expect(doorstep.length, `house "${house.id}"`).toBeGreaterThan(0);
		}
	});

	test("Every shipped house hands over something the catalogs know", () => {
		const known = new Set([...Object.keys(fantasyWeapons()), ...Object.keys(fantasyItems())]);

		for (const house of (skirmishHouses as HousesDocument).houses) {
			if (house.reward !== undefined && house.reward.length > 0) {
				expect(known, `house "${house.id}"`).toContain(house.reward);
			}
		}
	});

	function fantasyWeapons(): Record<string, unknown> {
		return ServiceRegistry.get<AssetStorage>(AssetStorage.name).getJson<{ weapons: Record<string, unknown> }>("catalog-weapons").weapons;
	}

	function fantasyItems(): Record<string, unknown> {
		return ServiceRegistry.get<AssetStorage>(AssetStorage.name).getJson<{ items: Record<string, unknown> }>("catalog-items").items;
	}
});

/**
 * Visiting end to end: the doors of the houses still worth a knock stand open at
 * the top of the battle, a unit that walks onto one is offered "Visit", the
 * villager speaks, the gift lands in the pack and the door shuts behind it.
 *
 * The deployment puts the player's Dardan on 4,10 and Elira on 5,10; the test
 * map puts a house on 4,12, within his five movement.
 */
suite("Visit Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(TileMapComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("visit-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const COLUMNS = 8;
	const ROWS = 16;
	const HOUSE = { column: 4, row: 12 };
	/** One tile north of the door - a unit knocks from beside it, never from inside it. */
	const DOORSTEP = { column: 4, row: 11 };

	const sketch = new Array(ROWS).fill(".".repeat(COLUMNS));
	const shipped = assets.getJson<HousesDocument>("houses-skirmish");

	/** The scenario sheet the feature reads, with the house put where Dardan can reach it. */
	const houseSheet = (overrides: Record<string, unknown> = {}): HousesDocument =>
		({
			format: "vigilans-houses",
			version: 1,
			houses: [
				{
					id: "cottage",
					column: HOUSE.column,
					row: HOUSE.row,
					openDoor: OPEN_DOOR,
					reward: "vulnerary",
					pages: [{ speaker: { de: "Alte Frau", en: "Old Woman" }, text: { de: "Guten Tag.", en: "Good day." } }],
					...overrides
				}
			]
		}) as HousesDocument;

	let units: UnitsFeature;
	let ui: UIFeature;
	let convoy: ConvoyFeature;
	let visit: VisitFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const unitData = (id: string) => unit(id).getComponent(UnitComponent).read();
	const pack = (id: string) => unitData(id).inventory.map((entry) => entry.id);

	const state = () => (VisitSystem.inWorld(world) as Entity).getComponent(VisitComponent).read();
	const convoyItems = () =>
		(ConvoySystem.inWorld(world) as Entity)
			.getComponent(ConvoyComponent)
			.read()
			.items.map((entry) => entry.id);
	const menu = () => {
		const state = stateManager.peek();

		return state instanceof MenuState ? state.getMenu()?.getComponent(MenuComponent).read() : undefined;
	};
	const dialog = () => (stateManager.getState(DialogState).getDialog() as Entity).getComponent(DialogComponent);
	const popup = () => stateManager.getState(PopupState).getPopup()?.getComponent(PopupComponent) ?? null;
	const notice = () => (popup() as PopupComponent).read();

	const tilemap = () => map.getComponent(TileMapComponent).read();
	const doorFrame = () => tilemap().layers[0].tiles[HOUSE.row * COLUMNS + HOUSE.column];

	/** An all-plain tile map with one shut door on the house tile. */
	const tileMapData = (): TileMapData => {
		const tiles = new Array(COLUMNS * ROWS).fill(0);
		tiles[HOUSE.row * COLUMNS + HOUSE.column] = CLOSED_DOOR;

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

	/** Picks Dardan up and sets him down on a tile, leaving his command menu open. */
	const moveTo = (column: number, row: number) => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		finishWalk();
	};

	/** Chooses "Visit" from the open command menu. */
	const chooseVisit = () => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.VISIT, index: 0, item: i18n("menu.visit") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver visit:requested
	};

	/** Reads to the end of the box and dismisses it, the way the advance command would. */
	const closeDialog = () => {
		dialog().update({ ...dialog().read(), closed: true });
		eventSystem.dispatch("ui:dialogClosed", { dialog: dialog().read().id });
		stateManager.pop();
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver convoy:requested
		eventSystem.processQueue(); // deliver convoy:delivered - the notice, or the choice menu
		eventSystem.processQueue();
	};

	/** Picks a row of the "what goes to the convoy?" menu, the way the menu system would. */
	const chooseConvoyRow = (index: number, id: string) => {
		stateManager.pop();
		eventSystem.dispatch("ui:menuConfirmed", { menu: CONVOY_MENU, row: id, index, item: id });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver convoy:delivered
		eventSystem.processQueue();
	};

	/** Backs out of that menu instead. */
	const cancelConvoyChoice = () => {
		stateManager.pop();
		eventSystem.dispatch("ui:menuCancelled", { menu: CONVOY_MENU });
		eventSystem.processQueue();
		eventSystem.processQueue();
		eventSystem.processQueue();
	};

	/** Acknowledges the gift notice, the way the dismiss command would. */
	const closePopup = () => {
		const component = popup() as PopupComponent;

		component.update({ ...component.read(), closed: true });
		eventSystem.dispatch("ui:popupClosed", { popup: component.read().id });
		stateManager.pop();
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver visit:finished
	};

	/** The whole visit: knock, read the villager out, take whatever they hand over. */
	const visitHouse = () => {
		chooseVisit();
		closeDialog();

		// A full pack asks what to give up first; keep the pack as it is.
		if (menu()?.id === CONVOY_MENU) {
			chooseConvoyRow(INVENTORY_SIZE, "vulnerary");
		}

		if (popup() !== null) {
			closePopup();
		}
	};

	/** Builds the map and installs the features, with `sheet` as the scenario's houses. */
	const start = (sheet: HousesDocument = houseSheet()) => {
		assets.setJson("houses-skirmish", sheet);

		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(sketch), 24));
		map.addComponent(TileMapComponent, tileMapData());
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		units = new UnitsFeature();
		units.install();
		ui = new UIFeature({ demo: false });
		ui.install();
		convoy = new ConvoyFeature({ dependencies: [units, ui] });
		convoy.install();
		visit = new VisitFeature({ dependencies: [units, convoy] });
		visit.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: COLUMNS, rows: ROWS });
		eventSystem.processQueue();
	};

	beforeEach(() => {
		stateManager.clear();
	});

	afterEach(() => {
		movement.uninstall();
		visit.uninstall();
		convoy.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		assets.setJson("houses-skirmish", shipped);
		eventSystem.processQueue();
	});

	suite("The open door", () => {
		test("A house nobody has called on has its door standing open when the map opens", () => {
			start();

			expect(doorFrame()).toBe(OPEN_DOOR);
			expect(state().visited).toStrictEqual([]);
			expect(state().doors).toStrictEqual([{ houseId: "cottage", layer: 0, cell: HOUSE.row * COLUMNS + HOUSE.column, closedDoor: CLOSED_DOOR }]);
		});

		test("Only the house's own cell changes - the rest of the map is left alone", () => {
			start();

			const tiles = tilemap().layers[0].tiles;

			expect(tiles.filter((frame) => frame !== 0)).toStrictEqual([OPEN_DOOR]);
			expect(tiles).toHaveLength(COLUMNS * ROWS);
		});

		test("A house pointed off the map is skipped rather than opening a cell that is not there", () => {
			start(houseSheet({ column: 99, row: 99 }));

			expect(state().doors).toStrictEqual([]);
			// Nothing was opened, and the door the map does draw is left exactly as authored.
			expect(tilemap().layers[0].tiles.filter((frame) => frame !== 0)).toStrictEqual([CLOSED_DOOR]);
		});
	});

	suite("Knocking", () => {
		test("A unit standing before the door is offered Visit", () => {
			start();

			moveTo(DOORSTEP.column, DOORSTEP.row);

			expect(menu()?.ids).toContain(UnitMenuRow.VISIT);
			// It sits above Items, where Fire Emblem puts the map action.
			expect(menu()?.ids.indexOf(UnitMenuRow.VISIT)).toBeLessThan(menu()?.ids.indexOf(UnitMenuRow.ITEMS) as number);
		});

		test("A unit standing in the doorway is not - the knock comes from outside", () => {
			start();

			moveTo(HOUSE.column, HOUSE.row);

			expect(menu()?.ids).not.toContain(UnitMenuRow.VISIT);
			expect(doorFrame()).toBe(OPEN_DOOR);
		});

		test("A unit one tile further off is not offered it either", () => {
			start();

			moveTo(HOUSE.column, HOUSE.row - 2);

			expect(menu()?.ids).not.toContain(UnitMenuRow.VISIT);
		});

		test("Visiting plays the villager's script in the textbox", () => {
			start();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();

			expect(stateManager.peek()).toBeInstanceOf(DialogState);
			expect(dialog().read().id).toBe("visit-cottage");
			expect(dialog().read().pages).toStrictEqual(["Good day."]);
			expect(dialog().read().speakers).toStrictEqual(["Old Woman"]);
		});

		test("Closing the box shuts the door, hands the gift over and spends the unit", () => {
			start();

			const finished: VisitFinishedEvent[] = [];
			eventSystem.subscribe("visit:finished", (event) => finished.push(event));

			const before = pack("dardan");

			moveTo(DOORSTEP.column, DOORSTEP.row);
			visitHouse();

			expect(doorFrame()).toBe(CLOSED_DOOR);
			expect(state().visited).toStrictEqual(["cottage"]);
			expect(pack("dardan")).toStrictEqual([...before, "vulnerary"]);
			expect(finished).toStrictEqual([expect.objectContaining({ unitId: "dardan", houseId: "cottage", itemId: "vulnerary" })]);

			// Visiting is the unit's action for the turn, the way using an item is.
			expect(unitData("dardan").hasMoved).toBe(true);
		});

		test("The gift is announced in a notice naming the unit and the item", () => {
			start();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();

			expect(stateManager.peek()).toBeInstanceOf(PopupState);
			expect(notice().id).toBe("visit-gift-cottage");
			expect(notice().title).toBe(i18n("visit.obtained"));
			// The catalog's name for the item, not its id, beside the unit that took it.
			expect(notice().lines).toStrictEqual([i18n("visit.received", { unit: unitData("dardan").name, item: "Vulnerary" })]);
		});

		test("The unit is only spent once the notice has been acknowledged", () => {
			start();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();

			// The notice is up: the gift is already in the pack, but the turn is not
			// over until the player has read what they got.
			expect(pack("dardan")).toContain("vulnerary");
			expect(unitData("dardan").hasMoved).toBe(false);

			closePopup();

			expect(unitData("dardan").hasMoved).toBe(true);
		});

		test("A house is called on once - the door stays shut and Visit is gone", () => {
			start();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			visitHouse();

			// Wake him back up and send him to the same doorstep.
			const component = unit("dardan").getComponent(UnitComponent);
			component.update({ ...component.read(), hasMoved: false });
			unit("dardan").getComponent(GridPositionComponent).update({ column: 4, row: 10 });

			moveTo(DOORSTEP.column, DOORSTEP.row);

			expect(menu()?.ids).not.toContain(UnitMenuRow.VISIT);
			expect(doorFrame()).toBe(CLOSED_DOOR);
		});

		test("A house with only words hands nothing over but still shuts its door", () => {
			start(houseSheet({ reward: "" }));

			const before = pack("dardan");

			moveTo(DOORSTEP.column, DOORSTEP.row);
			visitHouse();

			expect(pack("dardan")).toStrictEqual(before);
			expect(doorFrame()).toBe(CLOSED_DOOR);
			expect(state().visited).toStrictEqual(["cottage"]);
			// Nothing changed hands, so there is nothing to announce.
			expect(popup()).toBeNull();
			expect(unitData("dardan").hasMoved).toBe(true);
		});
	});

	suite("A full pack", () => {
		/** Tops Dardan's pack up to its every slot with copies of his bronze sword. */
		const fillPack = () => {
			const component = unit("dardan").getComponent(UnitComponent);
			const data = component.read();
			const padding = new Array(INVENTORY_SIZE - data.inventory.length).fill(null).map(() => ({ ...data.inventory[0], equipped: false }));

			component.update({ ...data, inventory: [...data.inventory, ...padding] });
			expect(pack("dardan")).toHaveLength(INVENTORY_SIZE);
		};

		test("Asks what to give up rather than leaving the gift behind", () => {
			start();
			fillPack();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();

			// The choice menu, not the notice: every carried slot plus the new item.
			expect(stateManager.peek()).toBeInstanceOf(MenuState);
			expect(menu()?.id).toBe(CONVOY_MENU);
			expect(menu()?.items).toHaveLength(INVENTORY_SIZE + 1);
			expect(menu()?.ids[INVENTORY_SIZE]).toBe("vulnerary");
			// The new arrival is badged and is where the cursor starts.
			expect(menu()?.badges[INVENTORY_SIZE]).toBe(i18n("convoy.new"));
			expect(menu()?.selectedIndex).toBe(INVENTORY_SIZE);
		});

		test("Giving up a carried entry sends that one to the convoy and takes the gift in", () => {
			start();
			fillPack();

			const finished: VisitFinishedEvent[] = [];
			eventSystem.subscribe("visit:finished", (event) => finished.push(event));

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();
			chooseConvoyRow(2, "iron-blade"); // his third slot

			expect(convoyItems()).toStrictEqual(["iron-blade"]);
			expect(pack("dardan")).toHaveLength(INVENTORY_SIZE);
			expect(pack("dardan")).not.toContain("iron-blade");
			expect(pack("dardan")[INVENTORY_SIZE - 1]).toBe("vulnerary");

			// The visit is over once the notice that follows has been read.
			closePopup();
			expect(finished).toStrictEqual([expect.objectContaining({ itemId: "vulnerary" })]);
		});

		test("Keeping the pack sends the gift itself to the convoy", () => {
			start();
			fillPack();

			const before = pack("dardan");

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();
			chooseConvoyRow(INVENTORY_SIZE, "vulnerary"); // the new arrival

			expect(convoyItems()).toStrictEqual(["vulnerary"]);
			expect(pack("dardan")).toStrictEqual(before);
		});

		test("Backing out of the choice does the same - the gift is already given", () => {
			start();
			fillPack();

			const before = pack("dardan");

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();
			cancelConvoyChoice();

			expect(convoyItems()).toStrictEqual(["vulnerary"]);
			expect(pack("dardan")).toStrictEqual(before);
		});

		test("The notice names what was given and what went on the baggage train", () => {
			start();
			fillPack();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();
			chooseConvoyRow(2, "iron-blade");

			expect(notice().lines).toStrictEqual([i18n("visit.received", { unit: unitData("dardan").name, item: "Vulnerary" }), i18n("visit.stored", { item: "Iron Blade" })]);
		});

		test("A gift that went straight to the convoy is not claimed to have been received", () => {
			start();
			fillPack();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			chooseVisit();
			closeDialog();
			chooseConvoyRow(INVENTORY_SIZE, "vulnerary");

			expect(notice().lines).toStrictEqual([i18n("visit.stored", { item: "Vulnerary" })]);
		});

		test("The unit is still spent, and the door still shut", () => {
			start();
			fillPack();

			moveTo(DOORSTEP.column, DOORSTEP.row);
			visitHouse();

			expect(state().visited).toStrictEqual(["cottage"]);
			expect(doorFrame()).toBe(CLOSED_DOOR);
			expect(unitData("dardan").hasMoved).toBe(true);
		});
	});

	suite("Who may knock", () => {
		test("An enemy on the doorstep is just standing on a doorstep", () => {
			start();

			unit("hasan")
				.getComponent(GridPositionComponent)
				.update({ ...DOORSTEP });

			expect(VisitSystem.available(state(), unit("hasan"))).toBeNull();
			expect(VisitSystem.available(state(), unit("dardan"))).toBeNull(); // he is still on 4,10
		});

		test("Asking for a house the unit is not beside is refused and puts the command menu back", () => {
			start();

			moveTo(HOUSE.column, HOUSE.row - 2);

			eventSystem.dispatch("visit:requested", { unitId: "dardan", houseId: "cottage" });
			eventSystem.processQueue();
			eventSystem.processQueue(); // deliver visit:cancelled

			expect(stateManager.peek()).toBeInstanceOf(MenuState);
			expect(state().visited).toStrictEqual([]);
			expect(unitData("dardan").hasMoved).toBe(false);
		});
	});
});
