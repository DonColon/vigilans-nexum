import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import { CombatFeature } from "@/game/combat/CombatFeature";
import { CombatAnimationComponent } from "@/game/combat/components/CombatAnimationComponent";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";
import { BattleAnimationSystem } from "@/game/combat/systems/BattleAnimationSystem";
import { ForecastSystem } from "@/game/combat/systems/ForecastSystem";
import { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";
import { ForecastState } from "@/game/combat/states/ForecastState";

/**
 * The attack flow end to end: move Dardan next to Hasan, "Attack" opens the
 * forecast, the weapon can be switched, and confirming plays the fight out -
 * Radiant Dawn formulas, real rolls - writing HP back and spending the attacker.
 */
suite("Combat Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("combat-flow-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let combat: CombatFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const unit = (id: string) =>
		UnitSystem.byId(
			world.getEntities().filter((entity) => entity.hasComponent(UnitComponent)),
			id
		);
	const sheet = (id: string) => (unit(id) as Entity).getComponent(UnitComponent).read();
	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();
	const forecast = () => (stateManager.getState(ForecastState) as ForecastState).getForecast()?.getComponent(ForecastComponent);
	const cursorAt = () => cursor.getComponent(GridPositionComponent).read();

	/** "Attack" from the command menu - opens the target-picking phase (cursor on the nearest enemy, no panel yet). */
	const beginAttack = () => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", index: 0, item: i18n("menu.attack") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver combat:requested
	};

	/** Confirm the current target - the same step `ForecastConfirmCommand` runs in the `target` phase. */
	const lockTarget = () => forecast()?.update({ ...forecast()!.read(), phase: "forecast", weaponIndex: 0 });

	/** Begin the attack and lock the nearest enemy in, so the forecast panel / weapon cycling is live. */
	const openForecast = () => {
		beginAttack();
		lockTarget();
	};

	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(10_000);
		eventSystem.processQueue();
		walkSystem.dispose();
	};

	/** Pick Dardan up and commit a move to (column,row). */
	const moveTo = (column: number, row: number) => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		finishWalk();
	};

	/** Runs ForecastSystem once so it reports a confirmed / cancelled forecast, then lets the fallout settle. */
	const pumpForecast = () => {
		const system = new ForecastSystem(10);
		system.execute(16, 0);
		eventSystem.processQueue(); // combat:confirmed -> resolve (pushes BattleAnimationState)
		eventSystem.processQueue();
		system.dispose();
	};

	/** Runs the battle animation to its end so deaths land and `combat:resolved` fires. */
	const finishBattleAnimation = () => {
		const system = new BattleAnimationSystem(8);
		system.execute(10_000);
		eventSystem.processQueue(); // unit:died -> remove, combat:resolved -> MovementFeature
		eventSystem.processQueue(); // unit:acted
		system.dispose();
	};

	beforeEach(() => {
		seedRandom(1);
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
		combat = new CombatFeature({ dependencies: [units] });
		combat.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		movement.uninstall();
		combat.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	test('The command menu offers "Attack" with an enemy in reach', () => {
		moveTo(4, 13); // next to Hasan at (4,14)
		expect(menu()?.items).toStrictEqual([i18n("menu.attack"), i18n("menu.items"), i18n("menu.wait")]);
	});

	test('"Attack" is left out with no enemy in range', () => {
		moveTo(4, 10); // Hasan is 4 tiles away, out of a sword's reach
		expect(menu()?.items).toStrictEqual([i18n("menu.items"), i18n("menu.wait")]);
	});

	test('"Attack" opens target-picking first, then the forecast on confirm', () => {
		moveTo(4, 13);
		beginAttack();

		expect(stateManager.peek()).toBeInstanceOf(ForecastState);
		expect(forecast()?.read()).toMatchObject({
			phase: "target", // no panel yet - just the cursor on the enemy
			attackerId: "dardan",
			defenderId: "hasan",
			weaponIds: ["bronze-sword", "iron-sword", "iron-blade"],
			weaponIndex: 0
		});

		lockTarget();
		expect(forecast()?.read().phase).toBe("forecast");
	});

	test("Cancelling in the forecast phase drops back to picking a target, not out of the attack", () => {
		moveTo(3, 14); // Hasan and Besnik both in reach
		beginAttack();
		lockTarget();
		expect(forecast()?.read().phase).toBe("forecast");

		// ForecastCancelCommand in the forecast phase: back to target, still the same attack.
		forecast()?.update({ ...forecast()!.read(), phase: "target" });
		pumpForecast();

		// Still in the attack (ForecastState), not back at the command menu.
		expect(stateManager.peek()).toBeInstanceOf(ForecastState);
		expect(forecast()?.read().phase).toBe("target");
	});

	test("Switching weapon in the forecast sticks - ForecastSystem's reconcile does not reset it", () => {
		moveTo(4, 13);
		openForecast();

		// What ForecastNextWeaponCommand does: bump weaponIndex, nothing else.
		forecast()?.update({ ...forecast()!.read(), weaponIndex: 2 });
		pumpForecast();
		pumpForecast();

		expect(forecast()?.read().weaponIndex).toBe(2);
		expect(forecast()?.read().weaponIds[2]).toBe("iron-blade");
	});

	test("Target picking lands the map cursor on the enemy, even when it is the only one in reach", () => {
		moveTo(4, 13); // only Hasan (4,14) within a sword's reach
		beginAttack();

		expect(stateManager.peek()).toBeInstanceOf(ForecastState);
		expect(forecast()?.read()).toMatchObject({ phase: "target", defenderId: "hasan", defenderIds: ["hasan"] });

		pumpForecast(); // parks the cursor on the target
		expect(cursorAt()).toStrictEqual({ column: 4, row: 14 });
	});

	test("Target picking cycles the map cursor between the enemies in reach", () => {
		moveTo(3, 14); // one tile from Hasan (4,14) and Besnik (2,14)
		beginAttack();

		expect(forecast()?.read().defenderIds).toStrictEqual(["hasan", "besnik"]);

		pumpForecast();
		expect(cursorAt()).toStrictEqual({ column: 4, row: 14 }); // starts on the nearest, Hasan

		// Cycle to the next target - `defenderId` resolves and the cursor follows.
		forecast()?.update({ ...forecast()!.read(), defenderIndex: 1 });
		pumpForecast();

		expect(forecast()?.read().defenderId).toBe("besnik");
		expect(cursorAt()).toStrictEqual({ column: 2, row: 14 });
	});

	test("Confirming fights whichever target was picked", () => {
		moveTo(3, 14);
		beginAttack();

		// Cycle to Besnik, lock him in, then commit from the forecast.
		forecast()?.update({ ...forecast()!.read(), defenderIndex: 1 });
		pumpForecast();
		lockTarget();
		forecast()?.update({ ...forecast()!.read(), confirmed: true });
		pumpForecast();
		finishBattleAnimation();

		expect(sheet("besnik").currentHP).toBeLessThan(22); // Besnik took the hit
		expect(sheet("hasan").currentHP).toBe(26); // Hasan untouched
	});

	test("Backing out of target picking puts the cursor back on the attacker", () => {
		moveTo(3, 14);
		beginAttack();

		pumpForecast();
		expect(cursorAt()).toStrictEqual({ column: 4, row: 14 });

		forecast()?.update({ ...forecast()!.read(), cancelled: true });
		pumpForecast();

		expect(cursorAt()).toStrictEqual({ column: 3, row: 14 }); // Dardan's tile
		expect(menu()?.id).toBe("unit-command");
	});

	test("Confirming the forecast readies the chosen weapon, fights, and spends the attacker", () => {
		let resolved = false;
		let acted: string | null = null;
		eventSystem.subscribe("combat:resolved", () => (resolved = true));
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		moveTo(4, 13);
		openForecast();

		// Preview and pick the Iron Blade (slot 2), then commit.
		forecast()?.update({ ...forecast()!.read(), weaponIndex: 2, confirmed: true });
		pumpForecast();

		// The fight is resolved in the data straight away; the animation just delays the visual.
		expect(stateManager.peek()).toBeInstanceOf(BattleAnimationState);
		expect(sheet("dardan").weapon?.id).toBe("iron-blade");
		expect(sheet("dardan").inventory[0].id).toBe("iron-blade");
		expect(sheet("dardan").inventory.find((entry) => entry.id === "iron-blade")?.uses).toBe(29);
		expect(resolved).toBe(false); // not until the animation lands
		expect((unit("dardan") as Entity).hasComponent(PendingMoveComponent)).toBe(true); // still mid-turn

		finishBattleAnimation();

		const dardan = unit("dardan") as Entity;
		expect(stateManager.peek()).toBeNull();
		expect(sheet("dardan").hasMoved).toBe(true);
		expect(dardan.hasComponent(PendingMoveComponent)).toBe(false);
		expect(dardan.hasComponent(CombatAnimationComponent)).toBe(false);
		expect(acted).toBe("dardan");
		expect(resolved).toBe(true);
		expect(sheet("hasan").currentHP).toBeLessThanOrEqual(26);
		expect(unit("hasan")).not.toBeNull();
	});

	test("Backing out of target picking re-opens the command menu", () => {
		moveTo(4, 13);
		beginAttack();
		expect(stateManager.peek()).toBeInstanceOf(ForecastState);

		forecast()?.update({ ...forecast()!.read(), cancelled: true });
		pumpForecast();

		expect(stateManager.peek()).toBeInstanceOf(MenuState);
		expect(menu()?.id).toBe("unit-command");
		expect((unit("dardan") as Entity).hasComponent(PendingMoveComponent)).toBe(true);
	});

	test("A defeated unit is taken off the map and reported", () => {
		let died: string | null = null;
		eventSystem.subscribe("unit:died", (event) => (died = event.unitId));

		// Hand Hasan a sliver of HP so any connecting hit finishes him.
		moveTo(4, 13);
		const hasanComponent = (unit("hasan") as Entity).getComponent(UnitComponent);
		hasanComponent.update({ ...hasanComponent.read(), currentHP: 1 });

		openForecast();
		forecast()?.update({ ...forecast()!.read(), confirmed: true });
		pumpForecast();

		// Hasan is at 0 HP in the data but still on the map, playing his fade-out.
		expect(died).toBeNull();
		expect(sheet("hasan").currentHP).toBe(0);
		expect(unit("hasan")).not.toBeNull();

		finishBattleAnimation();

		expect(died).toBe("hasan");
		expect(unit("hasan")).toBeNull();
		expect(sheet("dardan").hasMoved).toBe(true);
	});
});
