import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { UnitMovedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementComponent } from "@/game/movement/components/MovementComponent";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The Fire Emblem move flow end to end, with the unit and move features wired
 * together: `map:ready` deploys the units, confirm picks Dardan up, the cursor
 * traces a shortest-path preview through his range, confirm commits the move and
 * he walks the path there before `unit:moved` lands.
 */
suite("Unit Movement Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("unit-movement-test", { dimension: { width: 1280, height: 720 } });
	new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	// All plain, big enough to hold the deployment (Dardan 4,10 - Hasan 4,14).
	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
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

	beforeEach(() => {
		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		units = new UnitsFeature();
		units.install();
		movement = new MovementFeature({ dependencies: [units] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		movement.uninstall();
		units.uninstall();

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

		// Off the range: no preview.
		moveCursor(7, 0);
		preview.execute();
		expect(state().path).toStrictEqual([]);

		preview.dispose();
	});

	test("A second confirm commits the move and starts the walk", () => {
		let moved: UnitMovedEvent | null = null;
		eventSystem.subscribe("unit:moved", (event) => (moved = event));

		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();

		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 13, terrain: "plain" });
		eventSystem.processQueue();

		const dardan = unit("dardan");

		// Logical position and selection resolve at once; the walk is still running.
		expect(tileOf("dardan")).toStrictEqual({ column: 4, row: 13 });
		expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(true);
		expect(state().unitId).toBe("");
		expect(dardan.hasComponent(WalkComponent)).toBe(true);
		expect(dardan.getComponent(WalkComponent).read().path).toStrictEqual([
			{ column: 4, row: 10 },
			{ column: 4, row: 11 },
			{ column: 4, row: 12 },
			{ column: 4, row: 13 }
		]);

		// unit:moved only lands once the walk finishes.
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(50);
		eventSystem.processQueue();
		expect(moved).toBeNull();
		expect(dardan.hasComponent(WalkComponent)).toBe(true);

		walkSystem.execute(10_000);
		eventSystem.processQueue();

		expect(dardan.hasComponent(WalkComponent)).toBe(false);
		expect(moved).toMatchObject({ unitId: "dardan", fromColumn: 4, fromRow: 10, toColumn: 4, toRow: 13 });

		walkSystem.dispose();
	});

	test("Another unit cannot be picked up while one is walking", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 13, terrain: "plain" });
		eventSystem.processQueue();

		expect(unit("dardan").hasComponent(WalkComponent)).toBe(true);

		// Dardan is now logically on (4,13); confirming on him again is ignored.
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
