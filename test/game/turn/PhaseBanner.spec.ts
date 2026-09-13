import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { World } from "@/core/ecs/World";
import { EventSystem } from "@/core/events/EventSystem";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { MapState } from "@/game/map/states/MapState";
import { PhaseBannerComponent } from "@/game/turn/components/PhaseBannerComponent";
import { PHASE_BANNER_FADE_IN, PHASE_BANNER_HOLD, PHASE_BANNER_SLIDE, phaseBannerBox, phaseBannerDuration, phaseBannerFrame, phaseBannerHeight } from "@/game/turn/model/PhaseBanner";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { PhaseBannerSystem } from "@/game/turn/systems/PhaseBannerSystem";
import { TurnSystem } from "@/game/turn/systems/TurnSystem";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitFaction } from "@/game/units/model/UnitData";

/**
 * The "Player Phase" sweep at the start of a turn: it fades in, holds, fades
 * out and goes on its own, freezing the map underneath for as long as it is up.
 */
suite("Phase Banner Test Suite", () => {
	suite("phaseBannerFrame", () => {
		test("Starts invisible and slid to the left", () => {
			expect(phaseBannerFrame(0)).toStrictEqual({ alpha: 0, offset: -PHASE_BANNER_SLIDE, done: false });
		});

		test("Is fully up and centred through the hold", () => {
			expect(phaseBannerFrame(PHASE_BANNER_FADE_IN)).toStrictEqual({ alpha: 1, offset: 0, done: false });
			expect(phaseBannerFrame(PHASE_BANNER_FADE_IN + PHASE_BANNER_HOLD / 2)).toStrictEqual({ alpha: 1, offset: 0, done: false });
		});

		test("Fades and drifts right on the way out, then reports done", () => {
			const midway = phaseBannerFrame(PHASE_BANNER_FADE_IN + PHASE_BANNER_HOLD + 150);

			expect(midway.alpha).toBeGreaterThan(0);
			expect(midway.alpha).toBeLessThan(1);
			expect(midway.offset).toBeGreaterThan(0);
			expect(midway.done).toBe(false);

			expect(phaseBannerFrame(phaseBannerDuration())).toStrictEqual({ alpha: 0, offset: PHASE_BANNER_SLIDE, done: true });
			expect(phaseBannerFrame(phaseBannerDuration() + 1000).done).toBe(true);
		});
	});

	test("phaseBannerBox spans the screen and sits in its vertical middle", () => {
		const box = phaseBannerBox({ width: 1280, height: 720 });

		expect(box.getPosition().x).toBe(0);
		expect(box.getWidth()).toBe(1280);
		expect(box.getHeight()).toBe(phaseBannerHeight());
		expect(box.getPosition().y).toBe(Math.round((720 - phaseBannerHeight()) / 2));
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
			public static readonly type = "phase-banner-overlay-stub";
			onEnter() {}
			onExit() {}
			onPause() {}
			onResume() {}
		}

		const world = ServiceRegistry.get<World>(World.name);
		const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

		world.registerComponent(UnitComponent);

		const stateManager = new GameStateManager();
		// The state resets its (empty) command list on entry, which needs an input device - and that a display.
		new Display("phase-banner-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
		new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

		let feature: TurnFeature;

		const systems: (PhaseBannerSystem | TurnSystem)[] = [];

		const bannerSystem = () => {
			const system = new PhaseBannerSystem(0);
			systems.push(system);
			return system;
		};

		/** Ends the turn the way the global menu does, and lets `TurnSystem` complete it on the next frame. */
		const endTurn = () => {
			eventSystem.dispatch("turn:end", {});
			eventSystem.processQueue();

			const system = new TurnSystem(0);
			systems.push(system);
			system.execute();
			settle();
		};

		/** Drains the queue, and what the handlers queued in turn - `map:ready` announces the turn a hop later. */
		const settle = () => {
			eventSystem.processQueue();
			eventSystem.processQueue();
		};

		const banner = () => (stateManager.getState(PhaseBannerState).getBanner() as NonNullable<ReturnType<PhaseBannerState["getBanner"]>>).getComponent(PhaseBannerComponent).read();

		beforeEach(() => {
			stateManager.clear();
			stateManager.registerState(MapStub);
			stateManager.registerState(OverlayStub);
			stateManager.switch(MapStub);

			feature = new TurnFeature();
			feature.install();
		});

		afterEach(() => {
			while (systems.length > 0) {
				(systems.pop() as PhaseBannerSystem).dispose();
			}

			stateManager.clear();
			feature.uninstall();

			for (const entity of world.getEntities()) {
				world.unregisterEntity(entity);
			}

			eventSystem.processQueue();
		});

		test("The first turn opens with the player phase banner over the map", () => {
			eventSystem.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			settle();

			expect(stateManager.peek()).toBeInstanceOf(PhaseBannerState);
			expect(banner()).toStrictEqual({ turn: 1, faction: UnitFaction.PLAYER, elapsed: 0 });
		});

		test("Every later turn announces itself the same way", () => {
			eventSystem.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			settle();
			stateManager.pop();

			endTurn();

			expect(stateManager.peek()).toBeInstanceOf(PhaseBannerState);
			expect(banner().turn).toBe(2);
		});

		test("The banner never lands on top of something else - the turn waits until the map is on top", () => {
			eventSystem.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			settle();
			stateManager.pop();

			// An experience bar, say, still up from the last unit's fight.
			stateManager.push(OverlayStub);
			endTurn();

			expect(stateManager.peek()).toBeInstanceOf(OverlayStub);

			// Seen off - now the turn turns over and the banner goes up.
			stateManager.pop();
			(systems.at(-1) as TurnSystem).execute();
			settle();

			expect(stateManager.peek()).toBeInstanceOf(PhaseBannerState);
			expect(banner().turn).toBe(2);
		});

		test("The banner runs its clock and takes itself down once it has faded", () => {
			eventSystem.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			settle();

			const system = bannerSystem();

			system.execute(PHASE_BANNER_FADE_IN);
			expect(banner().elapsed).toBe(PHASE_BANNER_FADE_IN);
			expect(stateManager.peek()).toBeInstanceOf(PhaseBannerState);

			system.execute(phaseBannerDuration());
			expect(stateManager.peek()).toBeInstanceOf(MapStub);
			expect(world.getEntities().some((entity) => entity.hasComponent(PhaseBannerComponent))).toBe(false);
		});

		test("The clock only runs while the banner is on top", () => {
			eventSystem.dispatch("map:ready", { mapId: "map", columns: 8, rows: 8 });
			settle();

			stateManager.push(MapStub);
			bannerSystem().execute(phaseBannerDuration());

			expect(banner().elapsed).toBe(0);
		});
	});
});
