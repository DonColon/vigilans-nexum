import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { getI18n, i18n } from "@/core/i18n/I18n";
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
import { OptionsClosedEvent, OptionsRequestedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { GLOBAL_MENU, UnitMenuRow } from "@/game/movement/model/UnitMenus";
import {
	OptionsCancelCommand,
	OptionsConfirmCommand,
	OptionsDownCommand,
	OptionsNextCommand,
	OptionsPreviousCommand,
	OptionsUpCommand,
	optionsCommands
} from "@/game/options/commands/OptionsCommands";
import { OptionsComponent } from "@/game/options/components/OptionsComponent";
import { SwitchValue } from "@/core/options/Option";
import { channelVolumeId, DEFAULT_VOLUME, OptionId, TEXT_SPEED_DELAYS } from "@/game/options/model/GameOptions";
import { gameSettings, syncGameOptions, textRevealDelay } from "@/game/options/GameSettings";
import { OptionsFeature } from "@/game/options/OptionsFeature";
import { OptionsState } from "@/game/options/states/OptionsState";
import { OptionsSystem } from "@/game/options/systems/OptionsSystem";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The options screen end to end: the global menu opens it, left and right change
 * a setting, and the change has already landed by the time the screen closes.
 */
suite("Options Test Suite", () => {
	class TestBinding extends InputBinding {
		public pressed = false;

		constructor() {
			super({ channel: InputChannel.KEYBOARD, input: KeyboardInput.ENTER, state: InputState.JUST_PRESSED });
		}

		public condition(): boolean {
			return this.pressed;
		}
	}

	/**
	 * A stand-in for the audio device. jsdom has no AudioContext, so a real one
	 * cannot be built here - but what the settings owe the device is a call with
	 * the right channel and number, and that is what this records.
	 */
	class FakeAudioDevice {
		public readonly channels = ["sound", "music"];
		public readonly volumes = new Map<string, number>();

		public setVolume(volume: number, channel?: string): void {
			this.volumes.set(channel ?? "master", volume);
		}

		public getVolume(channel?: string): number {
			return this.volumes.get(channel ?? "master") ?? 100;
		}

		public getChannelNames(): string[] {
			return [...this.channels];
		}
	}

	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	// Registered before anything asks for the settings, so the options are built
	// with a channel row each - the way they are in the running game.
	const audio = new FakeAudioDevice();
	ServiceRegistry.register("AudioDevice", audio);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("options-test", { dimension: { width: 1536, height: 768 } });
	const stateManager = new GameStateManager();
	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let options: OptionsFeature;
	let movement: MovementFeature;
	let map: Entity;

	const bindings = new Map<(typeof optionsCommands)[number], TestBinding>();
	const systems: OptionsSystem[] = [];

	const settings = () => gameSettings();
	const locale = () => getI18n();
	const screen = () => (stateManager.getState(OptionsState).getOptions() as Entity).getComponent(OptionsComponent);

	/** An OptionsSystem whose query already sees the screen that exists right now. */
	const optionsSystem = () => {
		const system = new OptionsSystem(10);
		systems.push(system);
		return system;
	};

	/** Runs one command through the system, the way a single press would. */
	const press = (commandType: (typeof optionsCommands)[number]) => {
		const binding = bindings.get(commandType) as TestBinding;
		binding.pressed = true;

		const system = optionsSystem();
		system.execute(16, 0);
		// A second pass, so the tick that sees `closed` pops the state.
		system.execute(16, 1);

		binding.pressed = false;
		// A command stays "held" until it sees a frame without its input.
		inputDevice.getCommand(commandType).reset();

		eventSystem.processQueue();
	};

	const openFromMenu = () => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: GLOBAL_MENU, row: UnitMenuRow.OPTIONS, index: 1, item: i18n("menu.options") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver options:requested
	};

	/** Puts the highlight on a setting by id. */
	const selectRow = (id: OptionId) => {
		const component = screen();
		const data = component.read();

		component.update({ ...data, selectedIndex: data.optionIds.indexOf(id) });
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
		options = new OptionsFeature();
		options.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		for (const commandType of optionsCommands) {
			const binding = new TestBinding();

			inputDevice.getCommand(commandType).bindInput(binding);
			bindings.set(commandType, binding);
		}

		// Settings are a process-wide service, so each test starts from a known state
		// rather than from whatever the one before it left behind. syncGameOptions()
		// rather than a bare configure(), so the channel rows survive.
		syncGameOptions();
		settings()
			.set(OptionId.LANGUAGE, "de")
			.set(OptionId.TEXT_SPEED, "normal")
			.set(OptionId.BATTLE_ANIMATIONS, SwitchValue.ON)
			.set(OptionId.GRID_LINES, SwitchValue.ON)
			.set(OptionId.FULLSCREEN, SwitchValue.OFF)
			.set(OptionId.BRIGHTNESS, "100")
			.set(OptionId.MASTER_VOLUME, DEFAULT_VOLUME)
			.set(channelVolumeId("sound"), DEFAULT_VOLUME)
			.set(channelVolumeId("music"), DEFAULT_VOLUME);

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		while (systems.length > 0) {
			(systems.pop() as OptionsSystem).dispose();
		}

		movement.uninstall();
		options.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	suite("Opening", () => {
		test("The global menu's Options row asks for the screen", () => {
			const requested: OptionsRequestedEvent[] = [];
			eventSystem.subscribe("options:requested", (event) => requested.push(event));

			eventSystem.dispatch("ui:menuConfirmed", { menu: GLOBAL_MENU, row: UnitMenuRow.OPTIONS, index: 1, item: i18n("menu.options") });
			eventSystem.processQueue();
			eventSystem.processQueue();

			expect(requested).toHaveLength(1);
		});

		test("It lists every setting and sits on top, freezing the map", () => {
			openFromMenu();

			expect(stateManager.peek()).toBeInstanceOf(OptionsState);
			// Every setting the service knows about, in its own order - including a row
			// per audio channel the device reports.
			expect(screen().read().optionIds).toStrictEqual(
				settings()
					.all()
					.map((definition) => definition.id)
			);
			expect(screen().read().optionIds).toContain(OptionId.BRIGHTNESS);
			expect(screen().read().optionIds).toContain(OptionId.MASTER_VOLUME);
			expect(stateManager.getState(OptionsState).getCommands()).toHaveLength(optionsCommands.length);
		});
	});

	suite("Changing a setting", () => {
		test("Right and left step the highlighted setting through its choices", () => {
			openFromMenu();
			selectRow(OptionId.TEXT_SPEED);

			press(OptionsNextCommand);
			expect(settings().get(OptionId.TEXT_SPEED)).toBe("fast");

			press(OptionsPreviousCommand);
			expect(settings().get(OptionId.TEXT_SPEED)).toBe("normal");
		});

		test("Only the highlighted setting changes", () => {
			openFromMenu();
			selectRow(OptionId.GRID_LINES);

			press(OptionsNextCommand);

			expect(settings().get(OptionId.GRID_LINES)).toBe(SwitchValue.OFF);
			expect(settings().get(OptionId.BATTLE_ANIMATIONS)).toBe(SwitchValue.ON);
			expect(settings().get(OptionId.TEXT_SPEED)).toBe("normal");
		});

		test("Up and down move between settings, wrapping around", () => {
			openFromMenu();

			const last = screen().read().optionIds.length - 1;
			expect(screen().read().selectedIndex).toBe(0);

			press(OptionsUpCommand); // before the first, round to the last
			expect(screen().read().selectedIndex).toBe(last);

			press(OptionsDownCommand); // past the last, back to the first
			expect(screen().read().selectedIndex).toBe(0);
		});

		test("The change lands as it is made, not when the screen closes", () => {
			openFromMenu();
			selectRow(OptionId.BATTLE_ANIMATIONS);

			press(OptionsNextCommand);

			// Still open, and the setting already reads the new value.
			expect(stateManager.peek()).toBeInstanceOf(OptionsState);
			expect(settings().isEnabled(OptionId.BATTLE_ANIMATIONS)).toBe(false);
		});
	});

	suite("What the settings actually do", () => {
		test("Language switches the active locale, so everything relabels", () => {
			openFromMenu();
			selectRow(OptionId.LANGUAGE);

			expect(locale().getLocale()).toBe("de");
			expect(i18n("menu.options")).toBe("Optionen");

			press(OptionsNextCommand);

			expect(settings().get(OptionId.LANGUAGE)).toBe("en");
			expect(locale().getLocale()).toBe("en");
			expect(i18n("menu.options")).toBe("Options");
		});

		test("Text speed is the delay the textbox paces its reveal by", () => {
			expect(textRevealDelay()).toBe(TEXT_SPEED_DELAYS.normal);

			settings().set(OptionId.TEXT_SPEED, "instant");
			expect(textRevealDelay()).toBe(0);

			settings().set(OptionId.TEXT_SPEED, "slow");
			expect(textRevealDelay()).toBe(TEXT_SPEED_DELAYS.slow);
		});

		test("Master volume reaches the audio device", () => {
			settings().set(OptionId.MASTER_VOLUME, "40");

			expect(audio.getVolume()).toBe(40);
		});

		test("A channel volume reaches that channel, and only that channel", () => {
			settings().set(channelVolumeId("music"), "0");

			expect(audio.getVolume("music")).toBe(0);
			expect(audio.getVolume("sound")).toBe(Number(DEFAULT_VOLUME));
		});

		test("Applying pushes every setting out, so a fresh device is not left at its own defaults", () => {
			settings().set(OptionId.MASTER_VOLUME, "30").set(channelVolumeId("music"), "60");
			audio.volumes.clear();

			// What the feature does on install: hand the device everything at once,
			// rather than waiting for the player to touch a row.
			settings().applyAll();

			expect(audio.getVolume()).toBe(30);
			expect(audio.getVolume("music")).toBe(60);
			expect(audio.getVolume("sound")).toBe(Number(DEFAULT_VOLUME));
		});

		test("Brightness reaches the display", () => {
			const display = ServiceRegistry.get<Display>(Display);

			settings().set(OptionId.BRIGHTNESS, "70");
			expect(display.getBrightness()).toBe(70);

			settings().set(OptionId.BRIGHTNESS, "100");
			expect(display.getBrightness()).toBe(100);
		});

		test("A refused fullscreen puts the row back rather than claiming it worked", async () => {
			// jsdom never grants fullscreen, so this is the refusal path.
			settings().set(OptionId.FULLSCREEN, SwitchValue.ON);

			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(settings().get(OptionId.FULLSCREEN)).toBe(SwitchValue.OFF);
		});

		test("The switches read back as on or off", () => {
			expect(settings().isEnabled(OptionId.GRID_LINES)).toBe(true);

			settings().set(OptionId.GRID_LINES, SwitchValue.OFF);
			expect(settings().isEnabled(OptionId.GRID_LINES)).toBe(false);
		});

		test("A value a setting does not offer is ignored rather than stored", () => {
			settings().set(OptionId.TEXT_SPEED, "glacial");

			expect(settings().get(OptionId.TEXT_SPEED)).toBe("normal");
		});

		test("An id nothing defines reads as empty and is never enabled", () => {
			expect(settings().get("nonsense" as OptionId)).toBe("");
			expect(settings().isEnabled("nonsense" as OptionId)).toBe(false);
			expect(settings().cycle("nonsense" as OptionId, 1)).toBe("");
		});
	});

	suite("Closing", () => {
		test("Cancel closes it and reports the row it was left on", () => {
			const closed: OptionsClosedEvent[] = [];
			eventSystem.subscribe("options:closed", (event) => closed.push(event));

			openFromMenu();
			press(OptionsDownCommand);
			press(OptionsCancelCommand);

			expect(closed).toStrictEqual([expect.objectContaining({ selectedIndex: 1 })]);
			expect(stateManager.peek()).not.toBeInstanceOf(OptionsState);
			expect(world.getEntities().filter((entity) => entity.hasComponent(OptionsComponent))).toStrictEqual([]);
		});

		test("Confirm does the same - every change was applied on the way", () => {
			openFromMenu();
			selectRow(OptionId.GRID_LINES);
			press(OptionsNextCommand);
			press(OptionsConfirmCommand);

			expect(world.getEntities().filter((entity) => entity.hasComponent(OptionsComponent))).toStrictEqual([]);
			// Closing did not undo it.
			expect(settings().isEnabled(OptionId.GRID_LINES)).toBe(false);
		});

		test("Re-opening comes back to the row it was left on", () => {
			openFromMenu();
			press(OptionsDownCommand);
			press(OptionsCancelCommand);

			openFromMenu();

			expect(screen().read().selectedIndex).toBe(1);
		});
	});
});
