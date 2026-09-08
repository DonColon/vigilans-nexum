import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
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
import { MenuConfirmedEvent, MenuCancelledEvent } from "@/game.events";
import { MenuCancelCommand, MenuConfirmCommand, MenuDownCommand, MenuUpCommand, menuCommands } from "@/game/ui/commands/MenuCommands";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { MenuSystem } from "@/game/ui/systems/MenuSystem";

/**
 * Covers the menu the same way MapCursor.spec covers the cursor: the system
 * owns the query, the state on top decides which commands may run and confirm
 * or cancel is reported through an event before the state is popped.
 */
suite("UI Menu Test Suite", () => {
	class MapStub extends GameState {
		public static readonly type = "map-stub";
		onEnter() {}
		onExit() {}
		onPause() {}
		onResume() {}
	}

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
	world.registerComponent(MenuComponent);

	const stateManager = new GameStateManager();
	new Display("ui-menu-test", { dimension: { width: 1280, height: 720 } });
	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const bindings = new Map<GameCommandConstructor, TestBinding>();

	for (const commandType of menuCommands) {
		const binding = new TestBinding();
		inputDevice.registerCommand(commandType);
		inputDevice.getCommand(commandType).bindInput(binding);
		bindings.set(commandType, binding);
	}

	const press = (commandType: GameCommandConstructor) => (bindings.get(commandType)!.pressed = true);
	const release = () => bindings.forEach((binding) => (binding.pressed = false));

	let system: MenuSystem;
	let state: MenuState;
	let menu: Entity;

	const data = () => menu.getComponent(MenuComponent).read();

	beforeEach(() => {
		release();

		stateManager.clear();
		stateManager.registerState(MapStub);
		stateManager.registerState(MenuState);
		stateManager.switch(MapStub);

		state = stateManager.getState(MenuState) as MenuState;
		state.request({ id: "actions", title: "Kommando", items: ["Angriff", "Gegenstand", "Warten", "Zurück"] });
		stateManager.push(MenuState);

		menu = state.getMenu() as Entity;

		// Built after the menu entity exists, so the system's query snapshots it -
		// the entityChanged event that would otherwise add it is only delivered by
		// the game loop, which the test does not run.
		system = new MenuSystem(0);
	});

	afterEach(() => {
		system.dispose();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}
		eventSystem.processQueue();
	});

	test("State lists exactly the menu commands", () => {
		expect(state.getCommands()).toHaveLength(menuCommands.length);
	});

	test("Held down walks the highlight and wraps at the bottom", () => {
		expect(data().selectedIndex).toBe(0);

		press(MenuDownCommand);

		system.execute(16, 0);
		expect(data().selectedIndex).toBe(1);

		// Past the repeat delay, then one repeat rate per step.
		system.execute(300, 1);
		system.execute(90, 2);
		expect(data().selectedIndex).toBe(3);

		system.execute(90, 3);
		expect(data().selectedIndex).toBe(0);
	});

	test("Up wraps at the top", () => {
		press(MenuUpCommand);
		system.execute(16, 0);
		expect(data().selectedIndex).toBe(3);
	});

	test("Confirm reports the highlighted row and pops the menu", () => {
		let received: MenuConfirmedEvent | null = null;
		eventSystem.subscribe("ui:menuConfirmed", (event) => (received = event));

		release();
		press(MenuDownCommand);
		system.execute(16, 0);

		release();
		press(MenuConfirmCommand);
		system.execute(16, 1);

		// The confirm is picked up on the next tick, which reports it and pops.
		system.execute(16, 2);
		eventSystem.processQueue();

		expect(received).toMatchObject({ menu: "actions", index: 1, item: "Gegenstand" });
		expect(stateManager.peek()).toBeInstanceOf(MapStub);
	});

	test("Confirm reports the row id the menu was built with", () => {
		let received: MenuConfirmedEvent | null = null;
		eventSystem.subscribe("ui:menuConfirmed", (event) => (received = event));

		// A named menu: the ids travel with the rows and come back on the event, so
		// the opener never has to match on the label it happens to be showing.
		state.updateMenu({ id: "actions", items: ["Angriff", "Warten"], ids: ["attack", "wait"] });
		menu = state.getMenu() as Entity;

		release();
		press(MenuDownCommand);
		system.execute(16, 0);

		release();
		press(MenuConfirmCommand);
		system.execute(16, 1);

		system.execute(16, 2);
		eventSystem.processQueue();

		expect(received).toMatchObject({ menu: "actions", row: "wait", index: 1, item: "Warten" });
	});

	test("A menu that does not name its rows reports an empty id", () => {
		let received: MenuConfirmedEvent | null = null;
		eventSystem.subscribe("ui:menuConfirmed", (event) => (received = event));

		press(MenuConfirmCommand);
		system.execute(16, 0);

		system.execute(16, 1);
		eventSystem.processQueue();

		expect(received).toMatchObject({ menu: "actions", row: "", index: 0, item: "Angriff" });
	});

	test("Cancel closes the menu with a cancelled event", () => {
		let received: MenuCancelledEvent | null = null;
		eventSystem.subscribe("ui:menuCancelled", (event) => (received = event));

		press(MenuCancelCommand);
		system.execute(16, 0);
		system.execute(16, 1);
		eventSystem.processQueue();

		expect(received).toMatchObject({ menu: "actions" });
		expect(stateManager.peek()).toBeInstanceOf(MapStub);
	});

	test("The highlight does not move while another state is pushed on top", () => {
		stateManager.push(MapStub);

		press(MenuDownCommand);
		system.execute(16, 0);

		expect(data().selectedIndex).toBe(0);
	});
});
