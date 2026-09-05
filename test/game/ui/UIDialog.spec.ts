import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputDevice } from "@/core/input/InputDevice";
import { InputState } from "@/core/input/InputState";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { DialogClosedEvent } from "@/game.events";
import { AdvanceDialogCommand, dialogCommands } from "@/game/ui/commands/DialogCommands";
import { DialogComponent, DialogData } from "@/game/ui/components/DialogComponent";
import { DialogState } from "@/game/ui/states/DialogState";
import { DialogSystem } from "@/game/ui/systems/DialogSystem";

suite("UI Dialog Test Suite", () => {
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
	world.registerComponent(DialogComponent);

	const stateManager = new GameStateManager();
	new Display("ui-dialog-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	for (const commandType of dialogCommands) {
		inputDevice.registerCommand(commandType);
	}

	const advance = inputDevice.getCommand(AdvanceDialogCommand) as unknown as AdvanceDialogCommand;
	const binding = new TestBinding();
	advance.bindInput(binding);

	const systems: DialogSystem[] = [];

	/** A DialogSystem whose query already sees the entities that exist right now. */
	const dialogSystem = () => {
		const system = new DialogSystem(0);
		systems.push(system);
		return system;
	};

	beforeEach(() => {
		binding.pressed = false;
		advance.reset();

		stateManager.clear();
		stateManager.registerState(MapStub);
		stateManager.registerState(DialogState);
		stateManager.switch(MapStub);
	});

	afterEach(() => {
		while (systems.length > 0) {
			systems.pop()!.dispose();
		}

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}
		eventSystem.processQueue();
	});

	function makeDialog(pages: string[], overrides: Partial<DialogData> = {}): Entity {
		const entity = world.createEntity();
		entity.addComponent(TransformComponent, new TransformComponent({ x: 0, y: 0 }).toObject());
		entity.addComponent(DialogComponent, {
			id: "dialog",
			speaker: "",
			pages,
			pageIndex: 0,
			pageElapsed: 0,
			revealAll: false,
			closed: false,
			...overrides
		});
		return entity;
	}

	test("Advancing a page that is still revealing shows the rest of it at once", () => {
		const dialog = makeDialog(["line one", "line two"]);

		binding.pressed = true;
		advance.execute(16, 0, { dialog, fullyRevealed: false });

		const data = dialog.getComponent(DialogComponent).read();
		expect(data.revealAll).toBe(true);
		expect(data.pageIndex).toBe(0);
		expect(data.closed).toBe(false);
	});

	test("Advancing a fully shown page turns to the next one and restarts the reveal", () => {
		const dialog = makeDialog(["first", "second"], { revealAll: true, pageElapsed: 999 });

		binding.pressed = true;
		advance.execute(16, 0, { dialog, fullyRevealed: true });

		const data = dialog.getComponent(DialogComponent).read();
		expect(data.pageIndex).toBe(1);
		expect(data.revealAll).toBe(false);
		expect(data.pageElapsed).toBe(0);
	});

	test("Advancing the last fully shown page closes the dialog", () => {
		const dialog = makeDialog(["only page"], { revealAll: true });

		binding.pressed = true;
		advance.execute(16, 0, { dialog, fullyRevealed: true });

		expect(dialog.getComponent(DialogComponent).read().closed).toBe(true);
	});

	test("The dialog system ages the current page every tick", () => {
		const state = stateManager.getState(DialogState) as DialogState;
		state.request({ pages: ["a page"] });
		stateManager.push(DialogState);

		const system = dialogSystem();
		system.execute(100, 0);
		system.execute(50, 1);

		const dialog = state.getDialog() as Entity;
		expect(dialog.getComponent(DialogComponent).read().pageElapsed).toBe(150);
	});

	test("A closed dialog is popped and its close announced on the next tick", () => {
		const state = stateManager.getState(DialogState) as DialogState;
		state.request({ id: "lore", pages: ["a page"] });
		stateManager.push(DialogState);

		const dialog = state.getDialog() as Entity;
		const component = dialog.getComponent(DialogComponent);
		component.update({ ...component.read(), closed: true });

		let received: DialogClosedEvent | null = null;
		eventSystem.subscribe("ui:dialogClosed", (event) => (received = event));

		dialogSystem().execute(16, 0);
		eventSystem.processQueue();

		expect(received).toMatchObject({ dialog: "lore" });
		expect(stateManager.peek()).toBeInstanceOf(MapStub);
	});
});
