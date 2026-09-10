import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
import { POP_LIFETIME_MS, PopKind } from "@/game/units/model/UnitPop";
import { UnitTheme } from "@/game/units/model/UnitTheme";
import { UnitPopSystem } from "@/game/units/systems/UnitPopSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/** The units feature just puts the deployment sheet on the map and takes it off again. */
suite("Unit Deployment Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("unit-deploy-test", { dimension: { width: 1280, height: 720 } });
	new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	let feature: UnitsFeature;
	let map: Entity;
	let cursor: Entity;

	const units = () => world.getEntities().filter((entity) => entity.hasComponent(UnitComponent));

	beforeEach(() => {
		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(new Array(16).fill(".".repeat(8))), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 0, row: 0 });

		feature = new UnitsFeature();
		feature.install();
	});

	afterEach(() => {
		feature.uninstall();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	test("map:ready deploys the units from the deployment sheet", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		expect(units()).toHaveLength(4);

		const dardan = UnitSystem.byId(units(), "dardan") as Entity;
		expect(dardan.getComponent(GridPositionComponent).read()).toStrictEqual({ column: 4, row: 10 });
		expect(dardan.getComponent(UnitComponent).read().classLabel).toBe("Swordsman");
		expect(UnitSystem.byId(units(), "hasan")?.getComponent(UnitComponent).read().faction).toBe("enemy");
		expect(UnitSystem.byId(units(), "besnik")?.getComponent(GridPositionComponent).read()).toStrictEqual({ column: 2, row: 14 });

		// The second player unit, deployed right beside the commander so the two can trade.
		const elira = UnitSystem.byId(units(), "elira") as Entity;
		expect(elira.getComponent(GridPositionComponent).read()).toStrictEqual({ column: 5, row: 10 });
		expect(elira.getComponent(UnitComponent).read().faction).toBe("player");
		expect(elira.getComponent(UnitComponent).read().classLabel).toBe("Axe Fighter");
	});

	test("The commander is tagged and the cursor starts on him", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		const dardan = UnitSystem.byId(units(), "dardan") as Entity;
		const hasan = UnitSystem.byId(units(), "hasan") as Entity;

		expect(dardan.hasComponent(CommanderComponent)).toBe(true);
		expect(hasan.hasComponent(CommanderComponent)).toBe(false);
		expect(cursor.getComponent(GridPositionComponent).read()).toStrictEqual({ column: 4, row: 10 });
	});

	test("map:closed clears the units", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
		expect(units()).toHaveLength(4);

		eventSystem.dispatch("map:closed", {});
		eventSystem.processQueue();

		expect(units()).toHaveLength(0);
	});

	test("A fresh map:ready redeploys without leaving stale units", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		expect(units()).toHaveLength(4);
	});

	test("Using a healing item floats the restored HP over the unit in green", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		const dardan = UnitSystem.byId(units(), "dardan") as Entity;
		expect(dardan.hasComponent(UnitPopComponent)).toBe(false);

		eventSystem.dispatch("unit:usedItem", { unitId: "dardan", itemId: "vulnerary", healed: 10 });
		eventSystem.processQueue();

		expect(dardan.getComponent(UnitPopComponent).read()).toStrictEqual({ text: "+10", kind: PopKind.HEAL, elapsed: 0, duration: POP_LIFETIME_MS });

		// Green - and its own colour, not the one damage numbers are drawn in.
		const heal = UnitTheme.combatPop[PopKind.HEAL].asRGB();
		expect(heal.green).toBeGreaterThan(heal.red);
		expect(heal.green).toBeGreaterThan(heal.blue);
		expect(UnitTheme.combatPop[PopKind.HEAL].asHEX()).not.toBe(UnitTheme.combatPop[PopKind.DAMAGE].asHEX());
	});

	test("An item that healed nothing floats nothing", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		eventSystem.dispatch("unit:usedItem", { unitId: "dardan", itemId: "vulnerary", healed: 0 });
		eventSystem.processQueue();

		expect((UnitSystem.byId(units(), "dardan") as Entity).hasComponent(UnitPopComponent)).toBe(false);
	});

	test("The label ages away and is taken off the unit again", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		eventSystem.dispatch("unit:usedItem", { unitId: "dardan", itemId: "vulnerary", healed: 4 });
		eventSystem.processQueue();

		const dardan = UnitSystem.byId(units(), "dardan") as Entity;

		// Built once the pop exists, so the query snapshots it - the game loop is
		// what would otherwise deliver the entityChanged event.
		const system = new UnitPopSystem(8);

		system.execute(POP_LIFETIME_MS / 2);
		expect(dardan.getComponent(UnitPopComponent).read().elapsed).toBe(POP_LIFETIME_MS / 2);

		system.execute(POP_LIFETIME_MS / 2);
		expect(dardan.hasComponent(UnitPopComponent)).toBe(false);

		system.dispose();
	});
});
