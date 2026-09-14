import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { TurnChangedEvent } from "@/game.events";
import { MapState } from "@/game/map/states/MapState";
import { DIGIT_ZERO, turnDigits } from "@/game/turn/view/TurnHud";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { TurnSystem } from "@/game/turn/systems/TurnSystem";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { buildUnit } from "@/game/units/content/UnitSheets";
import { UnitComponent, UnitData, UnitFaction } from "@/game/units/components/UnitComponent";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

suite("Turn Test Suite", () => {
	test("turnDigits pads to two digits and maps to the sheet", () => {
		expect(turnDigits(1)).toStrictEqual([DIGIT_ZERO, DIGIT_ZERO + 1]);
		expect(turnDigits(3)).toStrictEqual([DIGIT_ZERO, DIGIT_ZERO + 3]);
		expect(turnDigits(12)).toStrictEqual([DIGIT_ZERO + 1, DIGIT_ZERO + 2]);
		expect(turnDigits(100)).toStrictEqual([DIGIT_ZERO + 1, DIGIT_ZERO, DIGIT_ZERO]);
	});

	suite("TurnFeature", () => {
		/** Stands in for the battle map: `TurnSystem` only tells the map by its type. */
		class MapStub extends GameState {
			public static readonly type = MapState.type;
			onEnter() {}
			onExit() {}
			onPause() {}
			onResume() {}
		}

		/** Anything pushed over the map - an experience bar, a popup, a fight. */
		class OverlayStub extends GameState {
			public static readonly type = "turn-overlay-stub";
			onEnter() {}
			onExit() {}
			onPause() {}
			onResume() {}
		}

		const world = ServiceRegistry.get<World>(World.name);
		const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);

		world.registerComponent(UnitComponent);

		const stateManager = new GameStateManager();
		// The phase banner state resets its command list on entry, which needs an input device - and that a display.
		new Display("turn-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
		new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

		let feature: TurnFeature;

		const systems: TurnSystem[] = [];

		/** A TurnSystem whose queries already see the entities that exist right now. */
		const turnSystem = () => {
			const system = new TurnSystem(0);
			systems.push(system);
			return system;
		};

		/** One frame: the queued events land, then the turn system runs. */
		const tick = () => {
			eventBus.processQueue();
			turnSystem().execute();
			eventBus.processQueue();
		};

		/** Takes the phase banner down again, so the map is back on top. */
		const dismissBanner = () => {
			if (stateManager.peek() instanceof MapStub) {
				return;
			}

			stateManager.pop();
		};

		const spawn = (document: unknown, moved = false) => {
			const data: UnitData = { ...buildUnit(document as Parameters<typeof buildUnit>[0]), hasMoved: moved };
			const entity = world.createEntity();
			entity.addComponent(UnitComponent, data);
			return entity;
		};

		const turnEntity = () => world.getEntities().find((entity) => entity.hasComponent(TurnComponent)) as Entity;
		const turn = () => turnEntity().getComponent(TurnComponent).read().number;
		const phase = () => turnEntity().getComponent(TurnComponent).read().phase;
		const moved = (unit: Entity, value: boolean) => {
			const component = unit.getComponent(UnitComponent);
			component.update({ ...component.read(), hasMoved: value });
		};

		beforeEach(() => {
			stateManager.clear();
			stateManager.registerState(MapStub);
			stateManager.registerState(OverlayStub);
			stateManager.switch(MapStub);

			feature = new TurnFeature();
			feature.install();
			eventBus.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			tick();
			dismissBanner();
		});

		afterEach(() => {
			while (systems.length > 0) {
				(systems.pop() as TurnSystem).dispose();
			}

			stateManager.clear();
			feature.uninstall();
			for (const entity of world.getEntities()) {
				world.unregisterEntity(entity);
			}
			eventBus.processQueue();
		});

		test("map:ready starts the counter at 1 and announces it", () => {
			let changed: TurnChangedEvent | null = null;
			feature.uninstall();
			eventBus.subscribe("turn:changed", (event) => (changed = event));
			feature.install();

			eventBus.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			tick();

			expect(turn()).toBe(1);
			expect(changed).toMatchObject({ number: 1, phase: UnitFaction.PLAYER });
		});

		test("turn:end with nobody on the other side goes straight to the next turn and wakes every player unit", () => {
			const dardan = spawn(dardanDocument, true);

			eventBus.dispatch("turn:end", {});
			tick();

			expect(turn()).toBe(2);
			expect(phase()).toBe(UnitFaction.PLAYER);
			expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
		});

		test("turn:end hands the phase to the enemy while it has units, and the counter only bumps when it comes back", () => {
			const dardan = spawn(dardanDocument, true);
			const hasan = spawn(hasanDocument, true);

			const changes: TurnChangedEvent[] = [];
			eventBus.subscribe("turn:changed", (event) => changes.push(event));

			eventBus.dispatch("turn:end", {});
			tick();

			// Same turn, the enemy's phase - and everyone is fresh, the player's army included.
			expect(turn()).toBe(1);
			expect(phase()).toBe(UnitFaction.ENEMY);
			expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
			expect(hasan.getComponent(UnitComponent).read().hasMoved).toBe(false);
			expect(changes.at(-1)).toMatchObject({ number: 1, phase: UnitFaction.ENEMY });
			dismissBanner();

			// The enemy phase ends the same way - and now the turn is over.
			moved(hasan, true);
			eventBus.dispatch("turn:end", {});
			tick();

			expect(turn()).toBe(2);
			expect(phase()).toBe(UnitFaction.PLAYER);
			expect(hasan.getComponent(UnitComponent).read().hasMoved).toBe(false);
			expect(changes.at(-1)).toMatchObject({ number: 2, phase: UnitFaction.PLAYER });
		});

		test("A phase ends on its own once every unit of the acting side has acted", () => {
			const dardan = spawn(dardanDocument);
			const other = spawn(dardanDocument);
			const hasan = spawn(hasanDocument); // the other side does not count

			moved(dardan, true);
			eventBus.dispatch("unit:acted", { unitId: "dardan" });
			tick();
			expect(phase()).toBe(UnitFaction.PLAYER); // `other` still has to move

			moved(other, true);
			eventBus.dispatch("unit:acted", { unitId: "dardan" });
			tick();
			expect(turn()).toBe(1);
			expect(phase()).toBe(UnitFaction.ENEMY);
			expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
			expect(other.getComponent(UnitComponent).read().hasMoved).toBe(false);
			dismissBanner();

			// The enemy's phase, in turn, ends once its last unit is spent.
			moved(hasan, true);
			eventBus.dispatch("unit:acted", { unitId: "hasan" });
			tick();
			expect(turn()).toBe(2);
			expect(phase()).toBe(UnitFaction.PLAYER);
		});

		test("A finished turn waits for whatever is over the map - the last fight's experience bar - before the next starts", () => {
			const dardan = spawn(dardanDocument, true);

			// The bar goes up in the same breath as the unit is spent.
			stateManager.push(OverlayStub);
			eventBus.dispatch("unit:acted", { unitId: "dardan" });
			tick();

			expect(turnEntity().getComponent(TurnComponent).read().ending).toBe(true);
			expect(turn()).toBe(1);
			expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(true);
			expect(stateManager.peek()).toBeInstanceOf(OverlayStub);

			// The bar is seen off - the map is on top again, and the turn turns over.
			stateManager.pop();
			tick();

			expect(turn()).toBe(2);
			expect(turnEntity().getComponent(TurnComponent).read().ending).toBe(false);
			expect(dardan.getComponent(UnitComponent).read().hasMoved).toBe(false);
		});

		test("map:closed clears the counter", () => {
			expect(world.getEntities().some((entity) => entity.hasComponent(TurnComponent))).toBe(true);

			eventBus.dispatch("map:closed", {});
			eventBus.processQueue();

			expect(world.getEntities().some((entity) => entity.hasComponent(TurnComponent))).toBe(false);
		});
	});
});
