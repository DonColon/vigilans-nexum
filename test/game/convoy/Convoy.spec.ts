import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { ConvoyDeliveredEvent } from "@/game.events";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ConvoyFeature } from "@/game/convoy/ConvoyFeature";
import { CONVOY_MENU, convoyChoiceRequest, convoyChoiceSlot } from "@/game/convoy/model/ConvoyMenus";
import { ConvoySystem } from "@/game/convoy/systems/ConvoySystem";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { buildUnit, INVENTORY_SIZE, UnitDocument } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import dardanDocument from "@/assets/data/units/dardan.unit.json";

suite("Convoy Menu Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);

	test("The rows are the pack plus the new arrival, badged and selected", () => {
		const unit = dardan();
		const incoming = { ...unit.inventory[3], id: "elixir", name: "Elixir" };
		const request = convoyChoiceRequest(unit.inventory, incoming);

		expect(request.id).toBe(CONVOY_MENU);
		expect(request.items).toHaveLength(unit.inventory.length + 1);
		expect(request.ids?.[unit.inventory.length]).toBe("elixir");

		// Only the new arrival is badged, and it is the row the cursor opens on.
		expect(request.badges?.filter((badge) => badge.length > 0)).toStrictEqual([i18n("convoy.new")]);
		expect(request.selectedIndex).toBe(unit.inventory.length);
	});

	test("A row the unit cannot wield still reads as dead weight here", () => {
		const unit = dardan();
		const axe = { ...unit.inventory[0], id: "iron-axe", name: "Iron Axe", equippable: false, equipped: false };
		const request = convoyChoiceRequest([...unit.inventory, axe], unit.inventory[0]);

		expect(request.disabled?.[unit.inventory.length]).toBe(true);
		expect(request.disabled?.[0]).toBe(false);
	});

	test("A chosen row is a pack slot, and anything outside the pack is the new arrival", () => {
		expect(convoyChoiceSlot(0, 4)).toBe(0);
		expect(convoyChoiceSlot(3, 4)).toBe(3);
		expect(convoyChoiceSlot(4, 4)).toBe(-1); // the incoming row, one past the pack
		expect(convoyChoiceSlot(-1, 4)).toBe(-1);
		expect(convoyChoiceSlot(1.5, 4)).toBe(-1);
	});
});

suite("Convoy System Test Suite", () => {
	const entry = (id: string) => ({ ...buildUnit(dardanDocument as UnitDocument).inventory[0], id, equipped: true });

	test("A stored entry is never still readied - nothing in the baggage train is in anybody's hands", () => {
		const stored = ConvoySystem.store({ items: [] }, entry("iron-sword"));

		expect(stored.items).toHaveLength(1);
		expect(stored.items[0].equipped).toBe(false);
		expect(stored.items[0].id).toBe("iron-sword");
	});

	test("Storing does not touch the convoy it was handed, and keeps arrival order", () => {
		const before = { items: [] };
		const after = ConvoySystem.store(ConvoySystem.store(before, entry("iron-sword")), entry("elixir"));

		expect(before.items).toStrictEqual([]);
		expect(after.items.map((item) => item.id)).toStrictEqual(["iron-sword", "elixir"]);
	});

	test("It counts what it is holding, duplicates included", () => {
		const data = ConvoySystem.store(ConvoySystem.store({ items: [] }, entry("elixir")), entry("elixir"));

		expect(ConvoySystem.countOf(data, "elixir")).toBe(2);
		expect(ConvoySystem.countOf(data, "iron-sword")).toBe(0);
	});
});

/**
 * Handing a unit an item when its pack is full: the convoy catches it, and the
 * player says what goes on the baggage train.
 */
suite("Convoy Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("convoy-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let convoy: ConvoyFeature;
	let map: Entity;

	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const unitData = (id: string) => unit(id).getComponent(UnitComponent).read();
	const pack = (id: string) => unitData(id).inventory.map((entry) => entry.id);

	const items = () =>
		(ConvoySystem.inWorld(world) as Entity)
			.getComponent(ConvoyComponent)
			.read()
			.items.map((entry) => entry.id);
	const menu = () => {
		const state = stateManager.peek();

		return state instanceof MenuState ? state.getMenu()?.getComponent(MenuComponent).read() : undefined;
	};

	const give = (unitId: string, itemId: string) => {
		eventSystem.dispatch("convoy:requested", { unitId, itemId });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver convoy:delivered
	};

	const choose = (index: number, id: string) => {
		stateManager.pop();
		eventSystem.dispatch("ui:menuConfirmed", { menu: CONVOY_MENU, row: id, index, item: id });
		eventSystem.processQueue();
		eventSystem.processQueue();
	};

	/** Tops a unit's pack up to its every slot with copies of its first entry. */
	const fillPack = (id: string) => {
		const component = unit(id).getComponent(UnitComponent);
		const data = component.read();
		const padding = new Array(INVENTORY_SIZE - data.inventory.length).fill(null).map(() => ({ ...data.inventory[0], equipped: false }));

		component.update({ ...data, inventory: [...data.inventory, ...padding] });
	};

	beforeEach(() => {
		stateManager.clear();

		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		units = new UnitsFeature();
		units.install();
		ui = new UIFeature({ demo: false });
		ui.install();
		convoy = new ConvoyFeature({ dependencies: [units, ui] });
		convoy.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		convoy.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	suite("With room in the pack", () => {
		test("The item simply goes in, and nothing is asked", () => {
			const delivered: ConvoyDeliveredEvent[] = [];
			eventSystem.subscribe("convoy:delivered", (event) => delivered.push(event));

			const before = pack("dardan");
			give("dardan", "elixir");

			expect(pack("dardan")).toStrictEqual([...before, "elixir"]);
			expect(items()).toStrictEqual([]);
			expect(menu()).toBeUndefined();
			expect(delivered).toStrictEqual([expect.objectContaining({ unitId: "dardan", itemId: "elixir", storedId: "" })]);
		});

		test("A weapon the class cannot wield is carried all the same, just not readied", () => {
			give("dardan", "iron-axe");

			const carried = unitData("dardan").inventory[unitData("dardan").inventory.length - 1];

			expect(carried.id).toBe("iron-axe");
			expect(carried.equippable).toBe(false);
			expect(carried.equipped).toBe(false);
			expect(unitData("dardan").weapon?.id).toBe("bronze-sword");
		});

		test("An id in neither catalog is delivered as nothing rather than stored", () => {
			const delivered: ConvoyDeliveredEvent[] = [];
			eventSystem.subscribe("convoy:delivered", (event) => delivered.push(event));

			const before = pack("dardan");
			give("dardan", "moon-cheese");

			expect(pack("dardan")).toStrictEqual(before);
			expect(items()).toStrictEqual([]);
			expect(delivered).toStrictEqual([expect.objectContaining({ itemId: "", storedId: "" })]);
		});
	});

	suite("With a full pack", () => {
		test("The player is asked what to give up", () => {
			fillPack("dardan");
			give("dardan", "elixir");

			expect(stateManager.peek()).toBeInstanceOf(MenuState);
			expect(menu()?.id).toBe(CONVOY_MENU);
			expect(menu()?.items).toHaveLength(INVENTORY_SIZE + 1);
			expect(menu()?.ids[INVENTORY_SIZE]).toBe("elixir");
		});

		test("Giving up a carried entry sends it away and takes the new one in", () => {
			fillPack("dardan");

			const delivered: ConvoyDeliveredEvent[] = [];
			eventSystem.subscribe("convoy:delivered", (event) => delivered.push(event));

			give("dardan", "elixir");
			choose(1, "iron-sword"); // his second slot

			expect(items()).toStrictEqual(["iron-sword"]);
			expect(pack("dardan")).toHaveLength(INVENTORY_SIZE);
			expect(pack("dardan")[INVENTORY_SIZE - 1]).toBe("elixir");
			expect(delivered).toStrictEqual([expect.objectContaining({ itemId: "elixir", storedId: "iron-sword" })]);
		});

		test("Giving up the readied weapon leaves the unit unarmed, as dropping it would", () => {
			fillPack("dardan");
			expect(unitData("dardan").weapon?.id).toBe("bronze-sword");

			give("dardan", "elixir");
			choose(0, "bronze-sword"); // the weapon in his hand

			expect(items()).toStrictEqual(["bronze-sword"]);
			expect(unitData("dardan").weapon).toBeNull();
		});

		test("Keeping the pack sends the new item itself away", () => {
			fillPack("dardan");

			const before = pack("dardan");

			give("dardan", "elixir");
			choose(INVENTORY_SIZE, "elixir");

			expect(items()).toStrictEqual(["elixir"]);
			expect(pack("dardan")).toStrictEqual(before);
		});

		test("Backing out does the same - the item has already changed hands", () => {
			fillPack("dardan");

			const before = pack("dardan");
			const delivered: ConvoyDeliveredEvent[] = [];
			eventSystem.subscribe("convoy:delivered", (event) => delivered.push(event));

			give("dardan", "elixir");

			stateManager.pop();
			eventSystem.dispatch("ui:menuCancelled", { menu: CONVOY_MENU });
			eventSystem.processQueue();
			eventSystem.processQueue();

			expect(items()).toStrictEqual(["elixir"]);
			expect(pack("dardan")).toStrictEqual(before);
			expect(delivered).toStrictEqual([expect.objectContaining({ itemId: "elixir", storedId: "elixir" })]);
		});

		test("The convoy keeps everything it is given, with no ceiling of its own", () => {
			fillPack("dardan");

			for (const itemId of ["elixir", "concoction", "vulnerary"]) {
				give("dardan", itemId);
				choose(INVENTORY_SIZE, itemId);
			}

			expect(items()).toStrictEqual(["elixir", "concoction", "vulnerary"]);
			expect(pack("dardan")).toHaveLength(INVENTORY_SIZE);
		});
	});

	test("The convoy is emptied with the map it was raised for", () => {
		fillPack("dardan");
		give("dardan", "elixir");
		choose(INVENTORY_SIZE, "elixir");
		expect(items()).toStrictEqual(["elixir"]);

		eventSystem.dispatch("map:closed", {});
		eventSystem.processQueue();

		expect(ConvoySystem.inWorld(world)).toBeNull();
	});
});
