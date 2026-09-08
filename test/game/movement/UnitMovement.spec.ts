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
import { UnitMovedEvent, UnitUsedItemEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementComponent } from "@/game/movement/components/MovementComponent";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The Fire Emblem move flow end to end: `map:ready` deploys the units, confirm
 * picks Dardan up, the cursor traces a shortest-path preview, confirm walks him
 * to the tile and opens the command menu - "Warten" spends him, backing out
 * reverts the move.
 */
suite("Unit Movement Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("unit-movement-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	// All plain, big enough to hold the deployment (Dardan 4,10 - Hasan 4,14).
	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const state = () => (world.getEntities().find((entity) => entity.hasComponent(MovementComponent)) as Entity).getComponent(MovementComponent).read();
	const unit = (id: string) =>
		UnitSystem.byId(
			world.getEntities().filter((entity) => entity.hasComponent(UnitComponent)),
			id
		) as Entity;
	const tileOf = (id: string) => unit(id).getComponent(GridPositionComponent).read();
	const moveCursor = (column: number, row: number) => cursor.getComponent(GridPositionComponent).update({ column, row });

	// A fresh system each time so its query snapshots the walking unit that
	// already exists - the entityChanged event that would add it is only
	// delivered by the loop, which the test does not run.
	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(10_000);
		eventSystem.processQueue();
		walkSystem.dispose();
	};

	/** Runs the move commit and the walk to completion, leaving the command menu open. */
	const walkTo = (column: number, row: number) => {
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		finishWalk();
	};

	beforeEach(() => {
		stateManager.clear();

		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		units = new UnitsFeature();
		units.install();
		ui = new UIFeature({ demo: false });
		ui.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		movement.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	test("Confirm on Dardan lights his movement and attack range", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();

		const selected = state();

		expect(selected.unitId).toBe("dardan");
		expect(selected).toMatchObject({ originColumn: 4, originRow: 10 });
		expect(MovementSystem.contains(selected.movement, 4, 13)).toBe(true);
		expect(MovementSystem.contains(selected.movement, 4, 14)).toBe(false); // Hasan stands there
		expect(MovementSystem.contains(selected.attack, 4, 14)).toBe(true);
	});

	test("The path preview follows the cursor through the range", () => {
		const preview = new PathPreviewSystem(12);

		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();

		moveCursor(4, 13);
		preview.execute();

		expect(state().path).toStrictEqual([
			{ column: 4, row: 10 },
			{ column: 4, row: 11 },
			{ column: 4, row: 12 },
			{ column: 4, row: 13 }
		]);

		moveCursor(7, 0); // off the range
		preview.execute();
		expect(state().path).toStrictEqual([]);

		preview.dispose();
	});

	test("A second confirm commits the move and walks the path", () => {
		let moved: UnitMovedEvent | null = null;
		eventSystem.subscribe("unit:moved", (event) => (moved = event));

		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();

		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 13, terrain: "plain" });
		eventSystem.processQueue();

		const dardan = unit("dardan");

		// The tile and the selection resolve at once; the unit is not spent yet.
		expect(tileOf("dardan")).toStrictEqual({ column: 4, row: 13 });
		expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
		expect(dardan.hasComponent(PendingMoveComponent)).toBe(true);
		expect(state().unitId).toBe("");
		expect(dardan.getComponent(WalkComponent).read().path).toStrictEqual([
			{ column: 4, row: 10 },
			{ column: 4, row: 11 },
			{ column: 4, row: 12 },
			{ column: 4, row: 13 }
		]);

		// unit:moved lands when the walk finishes, and the command menu opens.
		expect(moved).toBeNull();
		finishWalk();

		expect(dardan.hasComponent(WalkComponent)).toBe(false);
		expect(moved).toMatchObject({ unitId: "dardan", fromColumn: 4, fromRow: 10, toColumn: 4, toRow: 13 });
		expect(stateManager.peek()).toBeInstanceOf(MenuState);
	});

	test("Warten spends the unit and reports unit:acted", () => {
		let acted: string | null = null;
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		walkTo(4, 13);

		const dardan = unit("dardan");
		expect(dardan.hasComponent(PendingMoveComponent)).toBe(true);
		expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", index: 1, item: i18n("menu.wait") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver unit:acted

		expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(true);
		expect(dardan.hasComponent(PendingMoveComponent)).toBe(false);
		expect(tileOf("dardan")).toStrictEqual({ column: 4, row: 13 });
		expect(acted).toBe("dardan");

		// A spent unit cannot be picked up again.
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 13, terrain: "plain" });
		eventSystem.processQueue();
		expect(state().unitId).toBe("");
	});

	const menuState = () => stateManager.peek() as MenuState;
	const menu = () => menuState().getMenu()?.getComponent(MenuComponent).read();
	const submenu = () => menuState().getSubmenu()?.getComponent(MenuComponent).read();
	const sheet = (id: string) => unit(id).getComponent(UnitComponent).read();

	/** Move Dardan in place and open his items menu. */
	const openItems = () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		walkTo(4, 13);
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", index: 0, item: i18n("menu.items") });
		eventSystem.processQueue();
	};

	test("Items lists the pack with names, badges and uses/maxUses", () => {
		openItems();

		expect(menu()?.id).toBe("unit-items");
		expect(menu()?.items).toStrictEqual(["Bronze Sword", "Iron Sword", "Iron Blade", "Vulnerary"]);
		expect(menu()?.badges).toStrictEqual([i18n("menu.equipped"), "", "", ""]);
		expect(menu()?.values).toStrictEqual(["45/45", "45/45", "30/30", "3/3"]);
	});

	test("Selecting a row layers the action submenu while the items menu stays open", () => {
		const equipped: string[] = [];
		eventSystem.subscribe("unit:equipped", (event) => equipped.push(event.weaponId));

		openItems();

		// A weapon that is not readied offers Equip then Drop, in a submenu.
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-items", index: 2, item: "Iron Blade" });
		eventSystem.processQueue();
		expect(menu()?.id).toBe("unit-items"); // the pack list is still there
		expect(submenu()?.id).toBe("unit-item-action");
		expect(submenu()?.title).toBe("Iron Blade");
		expect(submenu()?.items).toStrictEqual([i18n("menu.equip"), i18n("menu.drop")]);

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-item-action", index: 0, item: i18n("menu.equip") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver unit:equipped

		expect(sheet("dardan").weapon?.id).toBe("iron-blade");
		expect(sheet("dardan").inventory[0].id).toBe("iron-blade");
		expect(sheet("dardan").hasMoved).toBe(false);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(true);
		expect(equipped).toStrictEqual(["iron-blade"]);

		// The submenu closed; the items menu refreshed with the new weapon leading.
		expect(submenu()).toBeUndefined();
		expect(menu()?.id).toBe("unit-items");
		expect(menu()?.items[0]).toBe("Iron Blade");
		expect(menu()?.badges).toStrictEqual([i18n("menu.equipped"), "", "", ""]);
	});

	test("The readied weapon offers Unequip, leaving the unit unarmed", () => {
		let unequipped: string | null = null;
		eventSystem.subscribe("unit:unequipped", (event) => (unequipped = event.unitId));

		openItems();

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-items", index: 0, item: "Bronze Sword" });
		eventSystem.processQueue();
		expect(submenu()?.items).toStrictEqual([i18n("menu.unequip"), i18n("menu.drop")]);

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-item-action", index: 0, item: i18n("menu.unequip") });
		eventSystem.processQueue();
		eventSystem.processQueue();

		expect(sheet("dardan").weapon).toBeNull();
		expect(sheet("dardan").inventory.some((entry) => entry.equipped)).toBe(false);
		expect(unequipped).toBe("dardan");
		expect(menu()?.badges.every((badge) => badge === "")).toBe(true); // no badge any more
	});

	test("Drop removes an item from the pack", () => {
		const dropped: string[] = [];
		eventSystem.subscribe("unit:droppedItem", (event) => dropped.push(event.itemId));

		openItems();

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-items", index: 3, item: "Vulnerary" });
		eventSystem.processQueue();
		expect(submenu()?.items).toStrictEqual([i18n("menu.drop")]); // a consumable is drop-only

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-item-action", index: 0, item: i18n("menu.drop") });
		eventSystem.processQueue();
		eventSystem.processQueue();

		expect(sheet("dardan").inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade"]);
		expect(dropped).toStrictEqual(["vulnerary"]);
		expect(submenu()).toBeUndefined();
		expect(menu()?.id).toBe("unit-items");
		expect(menu()?.items).toStrictEqual(["Bronze Sword", "Iron Sword", "Iron Blade"]);
	});

	test("Use heals the unit off a vulnerary and spends its turn", () => {
		const used: UnitUsedItemEvent[] = [];
		eventSystem.subscribe("unit:usedItem", (event) => used.push(event));
		let acted: string | null = null;
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		const component = unit("dardan").getComponent(UnitComponent);
		component.update({ ...component.read(), currentHP: 6 });

		openItems();

		// A wounded unit's vulnerary offers Use then Drop.
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-items", index: 3, item: "Vulnerary" });
		eventSystem.processQueue();
		expect(submenu()?.items).toStrictEqual([i18n("menu.use"), i18n("menu.drop")]);

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-item-action", index: 0, item: i18n("menu.use") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver unit:usedItem / unit:acted

		expect(sheet("dardan").currentHP).toBe(16); // 6 + 10, under the 20 cap
		expect(sheet("dardan").inventory[3].uses).toBe(2);
		expect(sheet("dardan").hasMoved).toBe(true);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(false);
		expect(used).toMatchObject([{ unitId: "dardan", itemId: "vulnerary", healed: 10 }]);
		expect(acted).toBe("dardan");

		// Every menu closed - the unit is done for the turn.
		expect(stateManager.peek()).not.toBeInstanceOf(MenuState);
	});

	test("Backing out of the submenu keeps the items menu; then items -> command -> reverts", () => {
		openItems();

		// items -> submenu
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-items", index: 1, item: "Iron Sword" });
		eventSystem.processQueue();
		expect(submenu()?.id).toBe("unit-item-action");

		// submenu closes, items menu still shown
		eventSystem.dispatch("ui:menuCancelled", { menu: "unit-item-action" });
		eventSystem.processQueue();
		expect(submenu()).toBeUndefined();
		expect(menu()?.id).toBe("unit-items");

		// items -> command
		eventSystem.dispatch("ui:menuCancelled", { menu: "unit-items" });
		eventSystem.processQueue();
		expect(menu()?.id).toBe("unit-command");

		// command -> move reverted
		eventSystem.dispatch("ui:menuCancelled", { menu: "unit-command" });
		eventSystem.processQueue();
		expect(tileOf("dardan")).toStrictEqual({ column: 4, row: 10 });
	});

	test("Confirm on an empty tile opens the global command menu; Zug beenden ends the turn", () => {
		let ended = false;
		eventSystem.subscribe("turn:end", () => (ended = true));

		eventSystem.dispatch("map:tileConfirmed", { column: 1, row: 1, terrain: "plain" });
		eventSystem.processQueue();

		expect(state().unitId).toBe("");
		expect(stateManager.peek()).toBeInstanceOf(MenuState);

		eventSystem.dispatch("ui:menuConfirmed", { menu: "global-command", index: 0, item: i18n("menu.endTurn") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver turn:end

		expect(ended).toBe(true);
	});

	test("Backing out of the command menu reverts the move and re-opens the range", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		walkTo(4, 13);

		const dardan = unit("dardan");
		expect(tileOf("dardan")).toStrictEqual({ column: 4, row: 13 });

		eventSystem.dispatch("ui:menuCancelled", { menu: "unit-command" });
		eventSystem.processQueue();

		expect(tileOf("dardan")).toStrictEqual({ column: 4, row: 10 });
		expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
		expect(dardan.hasComponent(PendingMoveComponent)).toBe(false);
		expect(cursor.getComponent(GridPositionComponent).read()).toStrictEqual({ column: 4, row: 10 });

		// The unit is selected again with its range lit from the origin.
		const selected = state();
		expect(selected.unitId).toBe("dardan");
		expect(selected).toMatchObject({ originColumn: 4, originRow: 10 });
		expect(MovementSystem.contains(selected.movement, 4, 13)).toBe(true);
	});

	test("Another unit cannot be picked up while one is walking", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 13, terrain: "plain" });
		eventSystem.processQueue();

		expect(unit("dardan").hasComponent(WalkComponent)).toBe(true);

		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 13, terrain: "plain" });
		eventSystem.processQueue();

		expect(state().unitId).toBe("");
	});

	test("Confirm off the range puts Dardan back without moving him", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();

		eventSystem.dispatch("map:tileConfirmed", { column: 0, row: 0, terrain: "plain" });
		eventSystem.processQueue();

		expect(tileOf("dardan")).toStrictEqual({ column: 4, row: 10 });
		expect(state().unitId).toBe("");
	});

	test("Enemy units cannot be picked up", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 14, terrain: "plain" });
		eventSystem.processQueue();

		expect(state().unitId).toBe("");
	});

	test("Cancel drops the selection", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		expect(state().unitId).toBe("dardan");

		eventSystem.dispatch("map:cancelled", {});
		eventSystem.processQueue();
		expect(state().unitId).toBe("");
	});
});
