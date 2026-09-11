import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { ThreatClearedEvent, ThreatShownEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { ThreatComponent } from "@/game/threat/components/ThreatComponent";
import { ThreatFeature } from "@/game/threat/ThreatFeature";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The enemy-range overlay end to end: confirm on an enemy lights it up without
 * picking anything up, the enemy-range button widens that to the whole army,
 * and the overlay follows the map as units move and die.
 *
 * The deployment puts the player's Dardan on 4,10 and Elira on 5,10 against the
 * enemy Hasan on 4,14 and Besnik on 2,14.
 */
suite("Enemy Range Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("threat-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	// All plain, big enough to hold the deployment (Dardan 4,10 - Hasan 4,14).
	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let movement: MovementFeature;
	let threat: ThreatFeature;
	let map: Entity;
	let cursor: Entity;

	const state = () => (world.getEntities().find((entity) => entity.hasComponent(ThreatComponent)) as Entity).getComponent(ThreatComponent).read();
	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const menu = () => world.getEntities().find((entity) => entity.hasComponent(MenuComponent)) ?? null;

	const covers = (tiles: { column: number; row: number }[], column: number, row: number) => MovementSystem.contains(tiles, column, row);

	// Twice: a handler's own dispatch is queued, so the second pass is what
	// delivers what the first one set off - unit:selected off a confirm, and the
	// threat:shown / threat:cleared this feature reports.
	const settle = () => {
		eventSystem.processQueue();
		eventSystem.processQueue();
	};

	const confirm = (column: number, row: number) => {
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		settle();
	};

	const press = (event: "map:cancelled" | "map:threatToggled") => {
		eventSystem.dispatch(event, {});
		settle();
	};

	// A fresh system each time so its query snapshots the walking unit that
	// already exists - see UnitMovement.spec.
	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(10_000);
		settle();
		walkSystem.dispose();
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
		threat = new ThreatFeature({ dependencies: [units] });
		threat.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		threat.uninstall();
		movement.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	suite("Looking at one enemy", () => {
		test("Confirm on an enemy shows its move and attack range without picking it up", () => {
			const shown: ThreatShownEvent[] = [];
			eventSystem.subscribe("threat:shown", (event) => shown.push(event));

			confirm(4, 14); // Hasan

			const overlay = state();
			expect(overlay.unitIds).toStrictEqual(["hasan"]);
			expect(overlay.all).toBe(false);
			expect(shown).toHaveLength(1);

			// Hasan is an axe fighter: 5 movement, everything in his pack reaches 1.
			expect(covers(overlay.movement, 4, 14)).toBe(true);
			expect(covers(overlay.movement, 4, 11)).toBe(true); // three tiles north
			expect(covers(overlay.movement, 4, 10)).toBe(false); // Dardan is standing there
			expect(covers(overlay.attack, 4, 10)).toBe(true); // which puts him well inside the reach
			expect(covers(overlay.attack, 4, 9)).toBe(false); // one tile past everything he can swing at

			// It is a look, not a selection - nothing is spent and no menu opens.
			expect(unit("hasan").getComponent(UnitComponent).read().hasMoved).toBe(false);
			expect(menu()).toBeNull();
		});

		test("Confirm on the same enemy again puts the overlay away", () => {
			const cleared: ThreatClearedEvent[] = [];
			eventSystem.subscribe("threat:cleared", (event) => cleared.push(event));

			confirm(4, 14);
			confirm(4, 14);

			expect(state().unitIds).toStrictEqual([]);
			expect(state().movement).toStrictEqual([]);
			expect(cleared).toHaveLength(1);
		});

		test("Confirm on a different enemy swaps the overlay over to it", () => {
			confirm(4, 14);
			confirm(2, 14); // Besnik

			expect(state().unitIds).toStrictEqual(["besnik"]);
			expect(covers(state().movement, 2, 14)).toBe(true);
		});

		test("Cancel puts it away", () => {
			confirm(4, 14);
			press("map:cancelled");

			expect(state().unitIds).toStrictEqual([]);
		});

		test("Confirm on your own unit is still the move flow, and picking one up drops the overlay", () => {
			confirm(4, 14);
			confirm(4, 10); // Dardan

			expect(state().unitIds).toStrictEqual([]);
			expect(unit("dardan").getComponent(UnitComponent).read().id).toBe("dardan");
		});

		test("Confirm on an empty tile is still the global menu", () => {
			confirm(0, 0);

			expect(state().unitIds).toStrictEqual([]);
			expect(menu()).not.toBeNull();
		});
	});

	suite("The enemy-range button", () => {
		test("It shows every enemy at once, merged into one overlay", () => {
			press("map:threatToggled");

			const overlay = state();
			expect(overlay.unitIds).toStrictEqual(["hasan", "besnik"]);
			expect(overlay.all).toBe(true);

			expect(covers(overlay.movement, 4, 14)).toBe(true); // where Hasan stands
			expect(covers(overlay.movement, 2, 14)).toBe(true); // where Besnik stands
			expect(covers(overlay.movement, 3, 14)).toBe(true); // between the two, listed once
			expect(overlay.movement.filter((tile) => tile.column === 3 && tile.row === 14)).toHaveLength(1);

			// No tile is in both washes.
			for (const tile of overlay.attack) {
				expect(covers(overlay.movement, tile.column, tile.row)).toBe(false);
			}
		});

		test("Pressing it again drops the lot", () => {
			press("map:threatToggled");
			press("map:threatToggled");

			expect(state().unitIds).toStrictEqual([]);
		});

		test("It widens a single enemy's overlay rather than toggling it off", () => {
			confirm(4, 14);
			press("map:threatToggled");

			expect(state().all).toBe(true);
			expect(state().unitIds).toStrictEqual(["hasan", "besnik"]);
		});

		test("The army-wide overlay stays up while your own unit is picked up and moved", () => {
			press("map:threatToggled");

			const before = state().movement.length;
			confirm(4, 10); // pick Dardan up - the danger zone is what the move is planned against

			expect(state().all).toBe(true);
			expect(state().movement).toHaveLength(before);

			confirm(4, 12); // walk him south, into the enemies' way
			finishWalk();

			// Dardan now blocks the tile, so the enemies cover less ground than before.
			expect(state().all).toBe(true);
			expect(state().movement.length).toBeLessThan(before);
			expect(covers(state().movement, 4, 12)).toBe(false);
		});

		test("An enemy taken off the map is dropped from the overlay", () => {
			press("map:threatToggled");
			expect(state().unitIds).toStrictEqual(["hasan", "besnik"]);

			const before = state().movement.length;

			world.unregisterEntity(unit("besnik"));
			eventSystem.dispatch("unit:died", { unitId: "besnik" });
			settle();

			expect(state().unitIds).toStrictEqual(["hasan"]);
			expect(state().movement.length).toBeLessThan(before);
		});

		test("The last enemy dying takes the overlay down with it", () => {
			confirm(4, 14);

			world.unregisterEntity(unit("hasan"));
			eventSystem.dispatch("unit:died", { unitId: "hasan" });
			settle();

			expect(state().unitIds).toStrictEqual([]);
		});
	});
});
