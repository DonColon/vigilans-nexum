import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputDevice } from "@/core/input/InputDevice";
import { InputState } from "@/core/input/InputState";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { StatusClosedEvent, StatusOpenedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { StatusCancelCommand, StatusConfirmCommand, StatusInfoCommand, StatusNextCommand, StatusPreviousCommand, statusCommands } from "@/game/status/commands/StatusCommands";
import { StatusComponent } from "@/game/status/components/StatusComponent";
import { StatusFeature } from "@/game/status/StatusFeature";
import { StatusState } from "@/game/status/states/StatusState";
import { StatusSystem } from "@/game/status/systems/StatusSystem";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The unit sheet end to end: the info button over a unit opens it, left and
 * right page through every unit on the map with the cursor following, and
 * closing it changes nothing about anyone.
 *
 * The deployment puts the player's Dardan on 4,10, Elira on 5,10 and Teuta on
 * 5,11 against the enemy Hasan on 4,14 and Besnik on 2,14.
 */
suite("Status Test Suite", () => {
	class TestBinding extends InputBinding {
		public pressed = false;

		constructor() {
			super({ channel: InputChannel.KEYBOARD, input: KeyboardInput.ENTER, state: InputState.JUST_PRESSED });
		}

		public condition(): boolean {
			return this.pressed;
		}
	}

	type StatusCommandType = typeof StatusPreviousCommand | typeof StatusNextCommand | typeof StatusConfirmCommand | typeof StatusCancelCommand | typeof StatusInfoCommand;

	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("status-test", { dimension: { width: 1536, height: 768 } });
	const stateManager = new GameStateManager();
	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let status: StatusFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const bindings = new Map<StatusCommandType, TestBinding>();

	const state = () => (stateManager.getState(StatusState).getStatus() as Entity).getComponent(StatusComponent);
	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const cursorTile = () => cursor.getComponent(GridPositionComponent).read();
	const systems: StatusSystem[] = [];

	/** A StatusSystem whose queries already see the sheet, the cursor and the units that exist right now. */
	const statusSystem = () => {
		const system = new StatusSystem(10);
		systems.push(system);
		return system;
	};

	/** Runs one command through the system, the way a single press would. */
	const press = (commandType: StatusCommandType) => {
		const binding = bindings.get(commandType) as TestBinding;
		binding.pressed = true;

		const system = statusSystem();
		system.execute(16, 0);
		// A second pass, so the tick that sees `closed` pops the state.
		system.execute(16, 1);

		binding.pressed = false;
		// A command remembers it was held until it sees a frame without the input;
		// releasing it by hand keeps the next press a fresh one rather than a repeat.
		inputDevice.getCommand(commandType).reset();

		eventSystem.processQueue();
	};

	/** The info button over a tile. */
	const info = (column: number, row: number) => {
		eventSystem.dispatch("map:infoRequested", { column, row });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver status:opened
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
		status = new StatusFeature({ dependencies: [units] });
		status.install();

		for (const commandType of statusCommands) {
			const binding = new TestBinding();

			inputDevice.getCommand(commandType).bindInput(binding);
			bindings.set(commandType as StatusCommandType, binding);
		}

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		while (systems.length > 0) {
			(systems.pop() as StatusSystem).dispose();
		}

		status.uninstall();
		movement.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	suite("Opening", () => {
		test("The info button over one of your units opens its sheet and reports it", () => {
			const opened: StatusOpenedEvent[] = [];
			eventSystem.subscribe("status:opened", (event) => opened.push(event));

			info(4, 10);

			expect(stateManager.peek()).toBeInstanceOf(StatusState);
			expect(StatusSystem.shownUnit(state().read())).toBe("dardan");
			expect(opened).toStrictEqual([expect.objectContaining({ unitId: "dardan" })]);
		});

		test("An enemy's sheet is as open as your own", () => {
			info(4, 14);

			expect(stateManager.peek()).toBeInstanceOf(StatusState);
			expect(StatusSystem.shownUnit(state().read())).toBe("hasan");
		});

		test("A spent unit can still be looked at", () => {
			const component = unit("elira").getComponent(UnitComponent);
			component.update({ ...component.read(), hasMoved: true });

			info(5, 10);

			expect(StatusSystem.shownUnit(state().read())).toBe("elira");
		});

		test("The info button over an empty tile opens nothing", () => {
			info(0, 0);

			expect(stateManager.peek()).not.toBeInstanceOf(StatusState);
		});

		test("It lists every unit on the map, so the pages can walk the whole field", () => {
			info(4, 10);

			const everyone = UnitSystem.inWorld(world).map((entity) => entity.getComponent(UnitComponent).read().id);

			expect(state().read().unitIds).toStrictEqual(everyone);
			expect(everyone).toContain("hasan");
			expect(everyone).toContain("besnik");
		});

		test("It sits on top, so the map stops taking input while it is up", () => {
			info(4, 10);

			expect(stateManager.getState(StatusState).getCommands()).toHaveLength(statusCommands.length);
		});

		test("A press while a unit walks a move is ignored - input is locked until it lands", () => {
			// The movement feature registered WalkComponent when it was installed.
			unit("dardan").addComponent(WalkComponent, { path: [{ column: 4, row: 10 }], elapsed: 0, duration: 100 });

			info(4, 10);

			expect(stateManager.peek()).not.toBeInstanceOf(StatusState);
		});
	});

	suite("Paging", () => {
		test("Right and left turn the page, wrapping around the map", () => {
			info(4, 10);

			const ids = state().read().unitIds;
			const start = ids.indexOf("dardan");

			press(StatusNextCommand);
			expect(state().read().index).toBe((start + 1) % ids.length);

			press(StatusPreviousCommand);
			press(StatusPreviousCommand);
			expect(state().read().index).toBe((start - 1 + ids.length) % ids.length);
		});

		test("The map cursor follows the page onto the unit it shows", () => {
			info(4, 10);
			expect(cursorTile()).toStrictEqual({ column: 4, row: 10 });

			press(StatusNextCommand);

			const shown = unit(StatusSystem.shownUnit(state().read()));
			expect(cursorTile()).toStrictEqual(UnitSystem.tileOf(shown));
			expect(cursorTile()).not.toStrictEqual({ column: 4, row: 10 });
		});
	});

	suite("Closing", () => {
		test("Cancel closes it and reports the unit it was left on", () => {
			const closed: StatusClosedEvent[] = [];
			eventSystem.subscribe("status:closed", (event) => closed.push(event));

			info(4, 10);
			press(StatusCancelCommand);

			expect(closed).toStrictEqual([expect.objectContaining({ unitId: "dardan" })]);
			expect(stateManager.peek()).not.toBeInstanceOf(StatusState);
			expect(world.getEntities().filter((entity) => entity.hasComponent(StatusComponent))).toStrictEqual([]);
		});

		test("Confirm does the same - there is nothing on a readout to choose", () => {
			info(4, 10);
			press(StatusConfirmCommand);

			expect(stateManager.peek()).not.toBeInstanceOf(StatusState);
		});

		test("The info button puts away what it opened", () => {
			info(4, 10);
			press(StatusInfoCommand);

			expect(stateManager.peek()).not.toBeInstanceOf(StatusState);
		});

		test("Closing after paging reports the unit paged to, and leaves the cursor on it", () => {
			const closed: StatusClosedEvent[] = [];
			eventSystem.subscribe("status:closed", (event) => closed.push(event));

			info(4, 10);
			press(StatusNextCommand);

			const shown = StatusSystem.shownUnit(state().read());

			press(StatusCancelCommand);

			expect(closed).toStrictEqual([expect.objectContaining({ unitId: shown })]);
			expect(cursorTile()).toStrictEqual(UnitSystem.tileOf(unit(shown)));
		});

		test("Nothing about anyone changes - it is a readout", () => {
			const before = UnitSystem.inWorld(world).map((entity) => JSON.stringify(entity.getComponent(UnitComponent).read()));

			info(4, 14);
			press(StatusNextCommand);
			press(StatusPreviousCommand);
			press(StatusConfirmCommand);

			expect(UnitSystem.inWorld(world).map((entity) => JSON.stringify(entity.getComponent(UnitComponent).read()))).toStrictEqual(before);
		});
	});
});
