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
import { StaffCancelledEvent, StaffConfirmedEvent, StaffResolvedEvent } from "@/game.events";
import { buildForecast } from "@/game/combat/model/BattleForecast";
import { CombatSystem } from "@/game/combat/systems/CombatSystem";
import { StaffChoiceComponent } from "@/game/staff/components/StaffChoiceComponent";
import { StaffFeature } from "@/game/staff/StaffFeature";
import { STAFF_MENU } from "@/game/staff/model/StaffMenus";
import { StaffState } from "@/game/staff/states/StaffState";
import { StaffChoiceSystem } from "@/game/staff/systems/StaffChoiceSystem";
import { StaffSystem } from "@/game/staff/systems/StaffSystem";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { Terrain } from "@/game/map/model/Terrain";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitMenuRow } from "@/game/movement/model/UnitMenus";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { ThreatSystem } from "@/game/threat/systems/ThreatSystem";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
import { buildUnit, getWeapon, UnitDocument } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import teutaDocument from "@/assets/data/units/teuta.unit.json";
import dardanDocument from "@/assets/data/units/dardan.unit.json";

/** The pure reach and healing maths, off any world. */
suite("Staff System Test Suite", () => {
	const teuta = () => buildUnit(teutaDocument as UnitDocument); // cleric: heal, door-key, chest-key
	const dardan = () => buildUnit(dardanDocument as UnitDocument);

	test("A cleric's staves are the staff entries it can wield - a sword is not one, nor a staff in a swordsman's pack", () => {
		expect(StaffSystem.staves(teuta()).map((entry) => entry.id)).toStrictEqual(["heal"]);
		expect(StaffSystem.staves(dardan())).toStrictEqual([]);

		const carrying = buildUnit({ ...(dardanDocument as UnitDocument), inventory: ["bronze-sword", "heal"] });
		expect(StaffSystem.staves(carrying)).toStrictEqual([]);
	});

	test("A staff restores its might plus the healer's magic, never past the wound", () => {
		const healer = teuta(); // magic 6
		const staff = getWeapon("heal"); // might 10

		expect(StaffSystem.healingBy(healer, staff, { ...dardan(), currentHP: 1 })).toBe(16);
		expect(StaffSystem.healingBy(healer, staff, { ...dardan(), currentHP: 10 })).toBe(10); // 20 max
		expect(StaffSystem.healingBy(healer, staff, dardan())).toBe(0);
		expect(StaffSystem.healingBy(healer, getWeapon("mend"), { ...dardan(), currentHP: 1 })).toBe(19);
	});

	test("A staff is never something to attack, counter or threaten with", () => {
		const cleric = teuta();

		expect(CombatSystem.weaponsReaching(cleric, 1)).toStrictEqual([]);
		expect(ThreatSystem.weaponReach(cleric)).toBeNull();

		// Struck at range one with a readied staff, the cleric just takes it.
		const forecast = buildForecast({
			attacker: dardan(),
			attackerWeapon: getWeapon("bronze-sword"),
			attackerTerrain: Terrain.PLAIN,
			defender: cleric,
			defenderTerrain: Terrain.PLAIN,
			distance: 1
		});
		expect(forecast.defender.weaponName).toBe("");
	});
});

/**
 * Fire Emblem's "Staff" end to end: Teuta the cleric is deployed beside Elira,
 * so once Elira is wounded Teuta's command menu offers it. Choosing it lists her
 * staff, then points the cursor at Elira; confirming puts the HP back, spends a
 * charge and spends Teuta's turn.
 *
 * The deployment puts Teuta on 5,11, Elira on 5,10 (beside her) and Dardan on
 * 4,10 (two tiles off - out of a Heal staff's reach).
 */
suite("Unit Staff Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("unit-staff-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let staff: StaffFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const sheet = (id: string) => unit(id).getComponent(UnitComponent).read();
	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();
	const cursorTile = () => cursor.getComponent(GridPositionComponent).read();
	const choice = () => (stateManager.getState(StaffState).getChoice() as Entity).getComponent(StaffChoiceComponent);

	/** Puts a wound on a unit, so there is someone to heal. */
	const wound = (id: string, currentHP: number) => {
		const component = unit(id).getComponent(UnitComponent);
		component.update({ ...component.read(), currentHP });
	};

	/** Runs StaffChoiceSystem once, so a flagged confirm / cancel is resolved and its fallout settles. */
	const pumpChoice = () => {
		const system = new StaffChoiceSystem(10);
		system.execute(16, 0);
		eventSystem.processQueue(); // staff:confirmed / staff:cancelled
		eventSystem.processQueue(); // staff:resolved / the menu coming back
		eventSystem.processQueue(); // unit:acted
		system.dispose();
	};

	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(10_000);
		eventSystem.processQueue();
		walkSystem.dispose();
	};

	/** Picks a unit up and sets it back down where it stands, leaving its command menu open. */
	const openCommandMenu = (column: number, row: number) => {
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		finishWalk();
	};

	/** Chooses "Staff", which opens the staff list. */
	const chooseStaffCommand = () => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.STAFF, index: 0, item: i18n("menu.staff") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver staff:requested
	};

	/** Picks a staff off the list, which opens the "who am I healing?" choice. */
	const chooseStaff = (staffId: string, index = 0) => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: STAFF_MENU, row: staffId, index, item: staffId });
		eventSystem.processQueue();
	};

	/** Settles on whoever the cursor is pointing at, which raises the staff. */
	const confirmTarget = () => {
		choice().update({ ...choice().read(), confirmed: true });
		pumpChoice();
	};

	beforeEach(() => {
		stateManager.clear();

		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 5, row: 11 });

		units = new UnitsFeature();
		units.install();
		ui = new UIFeature({ demo: false });
		ui.install();
		staff = new StaffFeature({ dependencies: [units, ui] });
		staff.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		movement.uninstall();
		staff.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	test("Staff is left out while nobody beside the cleric is wounded", () => {
		openCommandMenu(5, 11);

		expect(menu()?.items).not.toContain(i18n("menu.staff"));
		// And a staff lights no attack tiles, so there is no Attack either.
		expect(menu()?.items).not.toContain(i18n("menu.attack"));
	});

	test("The command menu offers Staff once an ally in reach is wounded", () => {
		wound("elira", 5);

		openCommandMenu(5, 11);

		expect(menu()?.items).toStrictEqual([i18n("menu.staff"), i18n("menu.items"), i18n("menu.trade"), i18n("menu.wait")]);
	});

	test("A unit without a staff is never offered it, however wounded its neighbour", () => {
		wound("elira", 5);

		openCommandMenu(4, 10); // Dardan, a swordsman beside the wounded Elira

		expect(menu()?.items).not.toContain(i18n("menu.staff"));
	});

	test("Staff is left out when the wounded ally is out of the staff's reach", () => {
		wound("dardan", 5); // two tiles from Teuta

		openCommandMenu(5, 11);

		expect(menu()?.items).not.toContain(i18n("menu.staff"));
	});

	test("Choosing Staff lists the staves, then points the cursor at the wounded ally", () => {
		wound("elira", 5);
		openCommandMenu(5, 11);
		chooseStaffCommand();

		expect(menu()?.id).toBe(STAFF_MENU);
		expect(menu()?.items).toStrictEqual(["Heal"]);
		expect(menu()?.values).toStrictEqual(["30/30"]);
		expect(menu()?.disabled).toStrictEqual([false]);

		chooseStaff("heal");

		expect(stateManager.peek()).toBeInstanceOf(StaffState);
		expect(choice().read()).toMatchObject({ unitId: "teuta", staffId: "heal", partnerIds: ["elira"], partnerId: "elira" });

		// The cursor is parked on Elira by the choice system.
		new StaffChoiceSystem(10).execute(16, 0);
		expect(cursorTile()).toStrictEqual({ column: 5, row: 10 });
	});

	test("Confirming raises the staff: HP back on the ally, a charge off the staff, the cleric spent", () => {
		const confirmed: StaffConfirmedEvent[] = [];
		const resolved: StaffResolvedEvent[] = [];
		let acted: string | null = null;
		eventSystem.subscribe("staff:confirmed", (event) => confirmed.push(event));
		eventSystem.subscribe("staff:resolved", (event) => resolved.push(event));
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		wound("elira", 3);
		openCommandMenu(5, 11);
		chooseStaffCommand();
		chooseStaff("heal");
		confirmTarget();

		expect(confirmed).toMatchObject([{ unitId: "teuta", targetId: "elira", staffId: "heal" }]);
		expect(resolved).toMatchObject([{ unitId: "teuta", targetId: "elira", staffId: "heal", healed: 16 }]); // 10 might + 6 magic
		expect(sheet("elira").currentHP).toBe(19);
		expect(sheet("teuta").inventory[0]).toMatchObject({ id: "heal", uses: 29 });

		// Healing is the cleric's action for the turn.
		expect(sheet("teuta").hasMoved).toBe(true);
		expect(unit("teuta").hasComponent(PendingMoveComponent)).toBe(false);
		expect(acted).toBe("teuta");
		expect(stateManager.peek()).not.toBeInstanceOf(StaffState);
		expect(stateManager.peek()).not.toBeInstanceOf(MenuState);

		// The restored HP floats over Elira, in green, the way a vulnerary's does.
		expect(unit("elira").getComponent(UnitPopComponent).read()).toMatchObject({ text: "+16", kind: "heal" });

		// The cursor is back on the cleric.
		expect(cursorTile()).toStrictEqual({ column: 5, row: 11 });
	});

	test("The heal never carries the ally past full health", () => {
		wound("elira", 15); // 21 max
		openCommandMenu(5, 11);
		chooseStaffCommand();
		chooseStaff("heal");
		confirmTarget();

		expect(sheet("elira").currentHP).toBe(21);
	});

	test("Backing out of the staff list puts the command menu back, with the turn intact", () => {
		const cancelled: StaffCancelledEvent[] = [];
		eventSystem.subscribe("staff:cancelled", (event) => cancelled.push(event));

		wound("elira", 5);
		openCommandMenu(5, 11);
		chooseStaffCommand();

		eventSystem.dispatch("ui:menuCancelled", { menu: STAFF_MENU });
		eventSystem.processQueue();
		eventSystem.processQueue();

		expect(cancelled).toMatchObject([{ unitId: "teuta" }]);
		expect(menu()?.id).toBe("unit-command");
		expect(menu()?.items).toContain(i18n("menu.staff"));
		expect(sheet("teuta").hasMoved).toBe(false);
		expect(sheet("elira").currentHP).toBe(5);
	});

	test("Backing out of the target choice does the same, and the cursor comes home", () => {
		wound("elira", 5);
		openCommandMenu(5, 11);
		chooseStaffCommand();
		chooseStaff("heal");

		choice().update({ ...choice().read(), cancelled: true });
		pumpChoice();

		expect(stateManager.peek()).toBeInstanceOf(MenuState);
		expect(menu()?.id).toBe("unit-command");
		expect(cursorTile()).toStrictEqual({ column: 5, row: 11 });
		expect(sheet("teuta").inventory[0].uses).toBe(30);
	});

	test("Several wounded allies in reach are cycled through, nearest first", () => {
		// Move Dardan beside Teuta as well, so she has two to choose from.
		unit("dardan").getComponent(GridPositionComponent).update({ column: 4, row: 11 });
		wound("elira", 5);
		wound("dardan", 5);

		openCommandMenu(5, 11);
		chooseStaffCommand();
		chooseStaff("heal");

		expect(choice().read().partnerIds.sort()).toStrictEqual(["dardan", "elira"]);

		choice().update({ ...choice().read(), partnerIndex: 1 });
		new StaffChoiceSystem(10).execute(16, 0);
		const second = choice().read().partnerId;
		expect(cursorTile()).toStrictEqual(UnitSystem.tileOf(unit(second)));

		confirmTarget();

		expect(sheet(second).currentHP).toBe(21 - (second === "elira" ? 0 : 1)); // Elira's max is 21, Dardan's 20
		expect(sheet(second === "elira" ? "dardan" : "elira").currentHP).toBe(5);
	});

	test("A staff that runs out breaks like a weapon, leaving the cleric unarmed", () => {
		const component = unit("teuta").getComponent(UnitComponent);
		const data = component.read();
		component.update({ ...data, inventory: data.inventory.map((entry, index) => (index === 0 ? { ...entry, uses: 1 } : entry)) });

		wound("elira", 5);
		openCommandMenu(5, 11);
		chooseStaffCommand();
		chooseStaff("heal");
		confirmTarget();

		expect(sheet("teuta").inventory.map((entry) => entry.id)).toStrictEqual(["door-key", "chest-key"]);
		expect(sheet("teuta").weapon).toBeNull();
	});
});
