import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputDevice } from "@/core/input/InputDevice";
import { InputState } from "@/core/input/InputState";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { cancelCommands } from "@/game/map/commands/CancelCommand";
import { confirmCommands } from "@/game/map/commands/ConfirmCommand";
import { threatCommands } from "@/game/map/commands/ThreatCommand";
import { infoCommands } from "@/game/map/commands/InfoCommand";
import { MoveCursorDownCommand, MoveCursorLeftCommand, MoveCursorRightCommand, MoveCursorUpCommand, moveCursorCommands } from "@/game/map/commands/MoveCursorCommand";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { TileMapComponent } from "@/game/map/components/TileMapComponent";
import { MapState } from "@/game/map/states/MapState";
import { CursorSystem } from "@/game/map/systems/CursorSystem";

/**
 * Covers the way the map is wired together: the system owns the queries, the
 * state on top of the stack decides which commands may run and the commands
 * act on the context they are handed.
 */
suite("Map Cursor Test Suite", () => {
	class MenuState extends GameState {
		public static readonly type = "menu";

		onEnter() {}
		onExit() {}
		onPause() {}
		onResume() {}
	}

	/** Binding switched by hand, standing in for a key being held. */
	class TestBinding extends InputBinding {
		public pressed: boolean;

		constructor() {
			super({ channel: InputChannel.KEYBOARD, input: KeyboardInput.ARROW_UP, state: InputState.JUST_PRESSED });
			this.pressed = false;
		}

		public condition(): boolean {
			return this.pressed;
		}
	}

	const world = ServiceRegistry.get<World>(World.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(TileMapComponent);
	world.registerComponent(CursorComponent);
	world.registerComponent(GridPositionComponent);

	// Built before anything creates an entity, so these are the instances the
	// states, commands and systems resolve out of the service registry.
	const stateManager = new GameStateManager();
	new Display("map-cursor-test", { dimension: { width: 1280, height: 720 } });
	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const bindings = new Map<GameCommandConstructor, TestBinding>();

	for (const commandType of moveCursorCommands) {
		const binding = new TestBinding();

		inputDevice.registerCommand(commandType);
		inputDevice.getCommand(commandType).bindInput(binding);

		bindings.set(commandType, binding);
	}

	// Allowed by MapState alongside the cursor commands; registered here so
	// resetCommands() can resolve every command the state lists.
	for (const commandType of [...confirmCommands, ...cancelCommands, ...threatCommands, ...infoCommands]) {
		inputDevice.registerCommand(commandType);
	}

	const press = (commandType: GameCommandConstructor) => {
		bindings.get(commandType)!.pressed = true;
	};

	const release = () => {
		for (const binding of bindings.values()) {
			binding.pressed = false;
		}
	};

	let state: MapState;
	let cursor: Entity;

	const tile = () => cursor.getComponent(GridPositionComponent).read();

	beforeEach(() => {
		release();

		stateManager.clear();
		stateManager.registerState(MapState);
		stateManager.registerState(MenuState);
		stateManager.switch(MapState);

		state = stateManager.getState(MapState) as MapState;
		cursor = state.getCursor() as Entity;
	});

	afterEach(() => {
		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}
	});

	test("State lists the cursor commands the map system runs", () => {
		expect(state.getCommands()).toHaveLength(moveCursorCommands.length + confirmCommands.length + cancelCommands.length + threatCommands.length + infoCommands.length);
		expect(state.getCommands(MoveCursorRightCommand)).toStrictEqual([inputDevice.getCommand(MoveCursorRightCommand)]);
	});

	test("Cursor steps one tile when its command is triggered", () => {
		const system = new CursorSystem(0);
		const start = tile();

		press(MoveCursorRightCommand);
		system.execute(16, 0);

		expect(tile()).toStrictEqual({ column: start.column + 1, row: start.row });

		system.dispose();
	});

	test("Holding a direction repeats after the initial delay", () => {
		const system = new CursorSystem(0);
		const start = tile();

		press(MoveCursorDownCommand);

		system.execute(16, 0);
		expect(tile().row).toBe(start.row + 1);

		// Still within the delay a held direction waits out before repeating.
		system.execute(200, 1);
		expect(tile().row).toBe(start.row + 1);

		system.execute(60, 2);
		expect(tile().row).toBe(start.row + 2);

		system.dispose();
	});

	test("Cursor stops at the border of the map", () => {
		const system = new CursorSystem(0);

		press(MoveCursorLeftCommand);

		for (let step = 0; step < 10; step++) {
			system.execute(300, step);
		}

		expect(tile().column).toBe(0);

		system.dispose();
	});

	test("Cursor does not move while another state is pushed on top", () => {
		const system = new CursorSystem(0);
		const start = tile();

		stateManager.push(MenuState);

		press(MoveCursorRightCommand);
		system.execute(16, 0);

		expect(tile()).toStrictEqual(start);

		// Back on the map the very same press moves it again.
		stateManager.pop();
		system.execute(16, 1);

		expect(tile().column).toBe(start.column + 1);

		system.dispose();
	});

	test("Cursor tile is written into its transform", () => {
		const system = new CursorSystem(0);
		const { cellSize } = (state.getMap() as Entity).getComponent(GridComponent).read();

		press(MoveCursorUpCommand);
		system.execute(16, 0);

		const { column, row } = tile();

		expect(cursor.getComponent(TransformComponent).read()).toMatchObject({
			x: column * cellSize,
			y: row * cellSize,
			parent: (state.getMap() as Entity).getID()
		});

		system.dispose();
	});
});
