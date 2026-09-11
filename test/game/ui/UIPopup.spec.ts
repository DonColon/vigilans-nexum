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
import { PopupClosedEvent } from "@/game.events";
import { CancelPopupCommand, ConfirmPopupCommand, popupCommands } from "@/game/ui/commands/PopupCommands";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { popupBox, popupHeight, POPUP_WIDTH } from "@/game/ui/model/UILayout";
import { UITheme } from "@/game/ui/model/UITheme";
import { PopupState } from "@/game/ui/states/PopupState";
import { PopupSystem } from "@/game/ui/systems/PopupSystem";

/**
 * The notice box: one short statement, centred, dismissed with a single press.
 * Everything under it is frozen while it is up, the way a textbox freezes the
 * map.
 */
suite("UI Popup Test Suite", () => {
	class MapStub extends GameState {
		public static readonly type = "popup-map-stub";
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
	world.registerComponent(PopupComponent);

	const stateManager = new GameStateManager();
	const display = new Display("ui-popup-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	for (const commandType of popupCommands) {
		inputDevice.registerCommand(commandType);
	}

	const confirm = inputDevice.getCommand(ConfirmPopupCommand) as unknown as ConfirmPopupCommand;
	const cancel = inputDevice.getCommand(CancelPopupCommand) as unknown as CancelPopupCommand;
	const confirmBinding = new TestBinding();
	const cancelBinding = new TestBinding();

	confirm.bindInput(confirmBinding);
	cancel.bindInput(cancelBinding);

	const systems: PopupSystem[] = [];

	/** A PopupSystem whose query already sees the entities that exist right now. */
	const popupSystem = () => {
		const system = new PopupSystem(0);
		systems.push(system);
		return system;
	};

	const open = (lines: string[], title?: string) => {
		stateManager.getState(PopupState).request({ id: "gift", title, lines });
		stateManager.push(PopupState);

		return stateManager.getState(PopupState).getPopup() as Entity;
	};

	const press = (binding: TestBinding) => {
		binding.pressed = true;

		const system = popupSystem();
		system.execute(16, 0);
		// A second pass, so the tick that sees `closed` pops the state.
		system.execute(16, 1);
		eventSystem.processQueue();
	};

	beforeEach(() => {
		confirmBinding.pressed = false;
		cancelBinding.pressed = false;
		confirm.reset();
		cancel.reset();

		stateManager.clear();
		stateManager.registerState(MapStub);
		stateManager.registerState(PopupState);
		stateManager.switch(MapStub);
	});

	afterEach(() => {
		while (systems.length > 0) {
			(systems.pop() as PopupSystem).dispose();
		}

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	suite("Opening", () => {
		test("The state builds the notice it was asked for and centres it", () => {
			const popup = open(["Dardan received: Iron Sword"], "Obtained");
			const data = popup.getComponent(PopupComponent).read();

			expect(data.id).toBe("gift");
			expect(data.title).toBe("Obtained");
			expect(data.lines).toStrictEqual(["Dardan received: Iron Sword"]);
			expect(data.closed).toBe(false);

			const box = popupBox(display.getViewportDimension(), 1, true);
			const position = popup.getComponent(TransformComponent).read();

			expect(position.x).toBe(box.getPosition().x);
			expect(position.y).toBe(box.getPosition().y);
		});

		test("It sits on top, so whatever was underneath stops taking input", () => {
			open(["something happened"]);

			expect(stateManager.peek()).toBeInstanceOf(PopupState);
			expect(stateManager.getState(PopupState).getCommands()).toHaveLength(popupCommands.length);
		});

		test("A request with no lines still shows something rather than an empty panel", () => {
			const popup = open([]);

			expect(popup.getComponent(PopupComponent).read().lines).toStrictEqual(["..."]);
		});
	});

	suite("Layout", () => {
		test("A panel is as tall as its heading and lines, and no wider than the cap", () => {
			expect(popupHeight(1, false)).toBe(UITheme.padding * 2 + UITheme.lineHeight);
			expect(popupHeight(1, true)).toBe(popupHeight(2, false));
			expect(popupHeight(3, true)).toBe(UITheme.padding * 2 + 4 * UITheme.lineHeight);

			expect(popupBox({ width: 1280, height: 720 }, 1, true).getWidth()).toBe(POPUP_WIDTH);
		});

		test("On a narrow screen it gives up width rather than running off the edge", () => {
			const narrow = popupBox({ width: 400, height: 720 }, 1, true);

			expect(narrow.getWidth()).toBeLessThan(POPUP_WIDTH);
			expect(narrow.getPosition().x).toBeGreaterThan(0);
		});
	});

	suite("Dismissing", () => {
		test("Confirm acknowledges it: the state is popped and the closure reported", () => {
			const closed: PopupClosedEvent[] = [];
			eventSystem.subscribe("ui:popupClosed", (event) => closed.push(event));

			open(["a gift"]);
			press(confirmBinding);

			expect(closed).toStrictEqual([expect.objectContaining({ popup: "gift" })]);
			expect(stateManager.peek()).toBeInstanceOf(MapStub);
			expect(world.getEntities().filter((entity) => entity.hasComponent(PopupComponent))).toStrictEqual([]);
		});

		test("Cancel does the same - there is nothing to back out of", () => {
			const closed: PopupClosedEvent[] = [];
			eventSystem.subscribe("ui:popupClosed", (event) => closed.push(event));

			open(["a gift"]);
			press(cancelBinding);

			expect(closed).toStrictEqual([expect.objectContaining({ popup: "gift" })]);
			expect(stateManager.peek()).toBeInstanceOf(MapStub);
		});

		test("With no press it just sits there", () => {
			const popup = open(["a gift"]);

			popupSystem().execute(16, 0);
			eventSystem.processQueue();

			expect(popup.getComponent(PopupComponent).read().closed).toBe(false);
			expect(stateManager.peek()).toBeInstanceOf(PopupState);
		});
	});
});
