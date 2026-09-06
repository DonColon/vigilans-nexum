import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/** The units feature just puts the deployment sheet on the map and takes it off again. */
suite("Unit Deployment Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);

	new Display("unit-deploy-test", { dimension: { width: 1280, height: 720 } });
	new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	let feature: UnitsFeature;
	let map: Entity;

	const units = () => world.getEntities().filter((entity) => entity.hasComponent(UnitComponent));

	beforeEach(() => {
		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(new Array(16).fill(".".repeat(8))), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

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

	test("map:ready deploys the units, map:closed clears them", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		expect(units()).toHaveLength(2);

		const dardan = UnitSystem.byId(units(), "dardan") as Entity;
		expect(dardan.getComponent(GridPositionComponent).read()).toStrictEqual({ column: 4, row: 10 });
		expect(dardan.getComponent(UnitComponent).read().classLabel).toBe("Swordsman");
		expect(UnitSystem.byId(units(), "hasan")?.getComponent(UnitComponent).read().faction).toBe("enemy");

		eventSystem.dispatch("map:closed", {});
		eventSystem.processQueue();

		expect(units()).toHaveLength(0);
	});

	test("A fresh map:ready redeploys without leaving stale units", () => {
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		expect(units()).toHaveLength(2);
	});
});
