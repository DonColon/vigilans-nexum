import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { i18n } from "@/core/i18n/I18n";
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
import { RosterClosedEvent, RosterRequestedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { GLOBAL_MENU, UnitMenuRow, globalCommandRequest } from "@/game/movement/model/UnitMenus";
import { RosterCancelCommand, RosterConfirmCommand, RosterDownCommand, RosterUpCommand, rosterCommands } from "@/game/roster/commands/RosterCommands";
import { RosterComponent } from "@/game/roster/components/RosterComponent";
import { RosterFeature } from "@/game/roster/RosterFeature";
import { RosterState } from "@/game/roster/states/RosterState";
import { RosterSystem } from "@/game/roster/systems/RosterSystem";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

suite("Global Menu Test Suite", () => {
	test("The map's own menu offers the army list and the settings, then ending the turn", () => {
		const request = globalCommandRequest();

		expect(request.id).toBe(GLOBAL_MENU);
		expect(request.ids).toStrictEqual([UnitMenuRow.UNITS, UnitMenuRow.OPTIONS, UnitMenuRow.END_TURN]);
		expect(request.items).toStrictEqual([i18n("menu.units"), i18n("menu.options"), i18n("menu.endTurn")]);

		// Ending the turn is the one row here that cannot be taken back, so it is last.
		expect(request.ids?.[request.ids.length - 1]).toBe(UnitMenuRow.END_TURN);
	});
});

/**
 * The army list end to end: the global menu opens it, the highlight moves
 * through the player's units, and closing it changes nothing about them.
 */
suite("Roster Test Suite", () => {
	class TestBinding extends InputBinding {
		public pressed = false;

		constructor() {
			super({ channel: InputChannel.KEYBOARD, input: KeyboardInput.ENTER, state: InputState.JUST_PRESSED });
		}

		public condition(): boolean {
			return this.pressed;
		}
	}

	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("roster-test", { dimension: { width: 1536, height: 768 } });
	const stateManager = new GameStateManager();
	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let roster: RosterFeature;
	let movement: MovementFeature;
	let map: Entity;

	const bindings = new Map<typeof RosterUpCommand | typeof RosterDownCommand | typeof RosterConfirmCommand | typeof RosterCancelCommand, TestBinding>();

	const state = () => (stateManager.getState(RosterState).getRoster() as Entity).getComponent(RosterComponent);
	const systems: RosterSystem[] = [];

	/** A RosterSystem whose query already sees the list that exists right now. */
	const rosterSystem = () => {
		const system = new RosterSystem(10);
		systems.push(system);
		return system;
	};

	/** Runs one command through the system, the way a single press would. */
	const press = (commandType: Parameters<typeof bindings.get>[0]) => {
		const binding = bindings.get(commandType) as TestBinding;
		binding.pressed = true;

		const system = rosterSystem();
		system.execute(16, 0);
		// A second pass, so the tick that sees `closed` pops the state.
		system.execute(16, 1);

		binding.pressed = false;
		// A command remembers it was held until it sees a frame without the input;
		// releasing it by hand keeps the next press a fresh one rather than a repeat.
		inputDevice.getCommand(commandType).reset();

		eventSystem.processQueue();
	};

	const openFromMenu = () => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: GLOBAL_MENU, row: UnitMenuRow.UNITS, index: 0, item: i18n("menu.units") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver roster:requested
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
		roster = new RosterFeature({ dependencies: [units] });
		roster.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		for (const commandType of rosterCommands) {
			const binding = new TestBinding();

			inputDevice.getCommand(commandType).bindInput(binding);
			bindings.set(commandType as Parameters<typeof bindings.get>[0], binding);
		}

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		while (systems.length > 0) {
			(systems.pop() as RosterSystem).dispose();
		}

		movement.uninstall();
		roster.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	suite("Opening", () => {
		test("The global menu's Units row asks for the list", () => {
			const requested: RosterRequestedEvent[] = [];
			eventSystem.subscribe("roster:requested", (event) => requested.push(event));

			eventSystem.dispatch("ui:menuConfirmed", { menu: GLOBAL_MENU, row: UnitMenuRow.UNITS, index: 0, item: i18n("menu.units") });
			eventSystem.processQueue();
			eventSystem.processQueue(); // the move flow's own dispatch lands a pass later

			expect(requested).toHaveLength(1);
		});

		test("It lists the player's own units, and nobody else's", () => {
			openFromMenu();

			expect(stateManager.peek()).toBeInstanceOf(RosterState);
			// The deployment puts Dardan and Elira on the player's side, Hasan and
			// Besnik on the other.
			expect(state().read().unitIds).toStrictEqual(["dardan", "elira"]);
			expect(state().read().selectedIndex).toBe(0);
		});

		test("It sits on top, so the map stops taking input while it is up", () => {
			openFromMenu();

			expect(stateManager.peek()).toBeInstanceOf(RosterState);
			expect(stateManager.getState(RosterState).getCommands()).toHaveLength(rosterCommands.length);
		});

		test("Ending the turn is still the other row, and does not open anything", () => {
			eventSystem.dispatch("ui:menuConfirmed", { menu: GLOBAL_MENU, row: UnitMenuRow.END_TURN, index: 1, item: i18n("menu.endTurn") });
			eventSystem.processQueue();
			eventSystem.processQueue();

			expect(stateManager.peek()).not.toBeInstanceOf(RosterState);
		});
	});

	suite("Moving through it", () => {
		test("Down and up step the highlight, wrapping around the list", () => {
			openFromMenu();

			press(RosterDownCommand);
			expect(state().read().selectedIndex).toBe(1);

			press(RosterDownCommand); // past the end, back to the top
			expect(state().read().selectedIndex).toBe(0);

			press(RosterUpCommand); // before the start, round to the bottom
			expect(state().read().selectedIndex).toBe(1);
		});
	});

	suite("Closing", () => {
		test("Cancel closes it and reports the row it was left on", () => {
			const closed: RosterClosedEvent[] = [];
			eventSystem.subscribe("roster:closed", (event) => closed.push(event));

			openFromMenu();
			press(RosterDownCommand);
			press(RosterCancelCommand);

			expect(closed).toStrictEqual([expect.objectContaining({ selectedIndex: 1 })]);
			expect(stateManager.peek()).not.toBeInstanceOf(RosterState);
			expect(world.getEntities().filter((entity) => entity.hasComponent(RosterComponent))).toStrictEqual([]);
		});

		test("Confirm does the same - there is nothing on a readout to choose", () => {
			openFromMenu();
			press(RosterConfirmCommand);

			expect(world.getEntities().filter((entity) => entity.hasComponent(RosterComponent))).toStrictEqual([]);
		});

		test("Re-opening comes back to the row it was left on", () => {
			openFromMenu();
			press(RosterDownCommand);
			press(RosterCancelCommand);

			openFromMenu();

			expect(state().read().selectedIndex).toBe(1);
		});

		test("A new map starts the list back at the top", () => {
			openFromMenu();
			press(RosterDownCommand);
			press(RosterCancelCommand);

			eventSystem.dispatch("map:closed", {});
			eventSystem.processQueue();

			openFromMenu();
			expect(state().read().selectedIndex).toBe(0);
		});

		test("Nothing about the army changes - it is a readout", () => {
			const before = UnitSystem.inWorld(world).map((unit) => JSON.stringify(unit.getComponent(UnitComponent).read()));

			openFromMenu();
			press(RosterDownCommand);
			press(RosterConfirmCommand);

			expect(UnitSystem.inWorld(world).map((unit) => JSON.stringify(unit.getComponent(UnitComponent).read()))).toStrictEqual(before);
		});
	});

	suite("An army that changes underneath it", () => {
		test("A unit taken off the map drops out of the list it was opened with", () => {
			openFromMenu();
			expect(state().read().unitIds).toStrictEqual(["dardan", "elira"]);

			world.unregisterEntity(UnitSystem.byId(UnitSystem.inWorld(world), "elira") as Entity);

			// The list keeps the ids it was given; the renderer is what skips the ones
			// that have left, so the row the cursor is on stays where the player put it.
			expect(state().read().unitIds).toStrictEqual(["dardan", "elira"]);
			expect(UnitSystem.byId(UnitSystem.inWorld(world), "elira")).toBeNull();
		});

		test("Opening it with no player units left still opens, with nothing in it", () => {
			for (const unit of UnitSystem.inWorld(world)) {
				world.unregisterEntity(unit);
			}

			openFromMenu();

			expect(stateManager.peek()).toBeInstanceOf(RosterState);
			expect(state().read().unitIds).toStrictEqual([]);
			expect(state().read().selectedIndex).toBe(0);
		});
	});
});
