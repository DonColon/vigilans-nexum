import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { InputDevice } from "@/core/input/InputDevice";
import { seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { CombatConfirmedEvent } from "@/game.events";
import { AIFeature } from "@/game/ai/AIFeature";
import { BehaviourComponent } from "@/game/ai/components/BehaviourComponent";
import { EnemyActionComponent, EnemyActionStep } from "@/game/ai/components/EnemyActionComponent";
import { EnemyBehaviour } from "@/game/ai/content/Behaviours";
import { EnemyPhaseState } from "@/game/ai/states/EnemyPhaseState";
import { EnemyPhaseSystem } from "@/game/ai/systems/EnemyPhaseSystem";
import { CombatFeature } from "@/game/combat/CombatFeature";
import { BattleAnimationSystem } from "@/game/combat/systems/BattleAnimationSystem";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { MapState } from "@/game/map/states/MapState";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { TurnSystem } from "@/game/turn/systems/TurnSystem";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { DEPLOYMENT_ASSET, DeploymentDocument } from "@/game/units/content/Deployments";
import { unitById, unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The enemy phase end to end: the turn is handed over, the map is held, each
 * enemy walks and strikes through the movement and combat features, and the
 * turn comes back to the player once the last of them is spent.
 */
suite("Enemy Phase Test Suite", () => {
	/** Stands in for the battle map: the turn and the enemy phase only tell the map by its type. */
	class MapStub extends GameState {
		public static readonly type = MapState.type;
		onEnter() {}
		onExit() {}
		onPause() {}
		onResume() {}
	}

	/** Anything pushed over the phase - an experience bar, a popup. */
	class OverlayStub extends GameState {
		public static readonly type = "enemy-phase-overlay-stub";
		onEnter() {}
		onExit() {}
		onPause() {}
		onResume() {}
	}

	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("enemy-phase-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	/** An open field the size the skirmish deployment fits in. */
	const sketch = new Array(16).fill(".".repeat(8));

	const deployment = assets.getJson<DeploymentDocument>(DEPLOYMENT_ASSET);

	let features: { install(): void; uninstall(): void }[] = [];
	let map: Entity;
	let cursor: Entity;
	let fights: CombatConfirmedEvent[] = [];
	let unsubscribe = () => {};

	const unit = (id: string) => unitById(unitsInWorld(world), id);
	const sheet = (id: string) => (unit(id) as Entity).getComponent(UnitComponent).read();
	const tile = (id: string) => (unit(id) as Entity).getComponent(GridPositionComponent).read();
	const turn = () => (world.entityWith(TurnComponent) as Entity).getComponent(TurnComponent).read();
	const cursorAt = () => cursor.getComponent(GridPositionComponent).read();
	const action = (id: string) => {
		const entity = unit(id);
		return entity !== null && entity.hasComponent(EnemyActionComponent) ? entity.getComponent(EnemyActionComponent).read() : null;
	};
	const holding = () => stateManager.peek() instanceof EnemyPhaseState;

	/** Runs a system for one frame and throws it away, so its queries see what exists right now. */
	const run = <T extends { execute(elapsed: number, frame: number): void; dispose(): void }>(system: T, elapsed: number) => {
		system.execute(elapsed, 0);
		system.dispose();
	};

	/** One frame of the game: the queued events land, then every clock involved runs. */
	const frame = (elapsed = 1000) => {
		eventBus.processQueue();
		run(new TurnSystem(8).initialize(), elapsed);
		run(new EnemyPhaseSystem(8).initialize(), elapsed);
		eventBus.processQueue();
		run(new UnitWalkSystem(8).initialize(), elapsed);
		run(new BattleAnimationSystem(8).initialize(), elapsed);
		eventBus.processQueue();
	};

	/** Frames until `done`, or a bounded number of them - a stuck phase fails rather than hangs. */
	const frames = (done: () => boolean, limit = 60) => {
		for (let count = 0; count < limit; count++) {
			if (done()) {
				return;
			}

			frame();
		}

		throw new Error("The enemy phase did not get there in time");
	};

	/** Takes the phase banner down, so whatever is under it is on top again. */
	const dismissBanner = () => {
		if (stateManager.peek() instanceof PhaseBannerState) {
			stateManager.pop();
		}
	};

	/** Ends the player's phase: the banner for the enemy's goes up and comes down again. */
	const handOver = () => {
		eventBus.dispatch("turn:end", {});
		frame();
		expect(turn()).toMatchObject({ number: 1, phase: UnitFaction.ENEMY });
		dismissBanner();
	};

	const install = () => {
		const units = new UnitsFeature();
		const ui = new UIFeature({ demo: false });
		const turnFeature = new TurnFeature({ dependencies: [units] });
		const combat = new CombatFeature({ dependencies: [units] });
		const movement = new MovementFeature({ dependencies: [units, ui] });
		const ai = new AIFeature({ dependencies: [units, turnFeature, combat, movement] });

		features = [units, ui, turnFeature, combat, movement, ai];

		for (const feature of features) {
			feature.install();
		}

		eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventBus.processQueue();
		eventBus.processQueue(); // turn:changed -> the player's banner
		dismissBanner();
	};

	beforeEach(() => {
		seedRandom(1);
		stateManager.clear();
		stateManager.registerState(MapStub);
		stateManager.registerState(OverlayStub);
		stateManager.switch(MapStub);

		map = world.createEntity();
		map.addComponent(GridComponent, GridComponent.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		fights = [];
		unsubscribe = eventBus.subscribe("combat:confirmed", (event) => fights.push(event));

		install();
	});

	afterEach(() => {
		unsubscribe();
		assets.setJson(DEPLOYMENT_ASSET, deployment);

		for (const feature of [...features].reverse()) {
			feature.uninstall();
		}

		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventBus.processQueue();
	});

	suite("Behaviours", () => {
		test("Every enemy is tagged when the map opens - the rank and file charge", () => {
			for (const enemy of unitsOfFaction(unitsInWorld(world), UnitFaction.ENEMY)) {
				expect(enemy.getComponent(BehaviourComponent).read().behaviour).toBe(EnemyBehaviour.CHARGE);
			}

			for (const ally of unitsOfFaction(unitsInWorld(world), UnitFaction.PLAYER)) {
				expect(ally.hasComponent(BehaviourComponent)).toBe(false);
			}
		});

		test("A placement's behaviour is read off the deployment sheet", () => {
			assets.setJson(DEPLOYMENT_ASSET, {
				...deployment,
				units: deployment.units.map((placement) => (placement.unit === "hasan" ? { ...placement, behaviour: "hold" } : placement))
			});

			eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
			eventBus.processQueue();

			expect((unit("hasan") as Entity).getComponent(BehaviourComponent).read().behaviour).toBe(EnemyBehaviour.HOLD);
			expect((unit("besnik") as Entity).getComponent(BehaviourComponent).read().behaviour).toBe(EnemyBehaviour.CHARGE);
		});
	});

	suite("The phase", () => {
		test("It holds the map once the banner is gone, and not before", () => {
			eventBus.dispatch("turn:end", {});
			frame();

			// The banner is up: the phase waits under it.
			expect(stateManager.peek()).toBeInstanceOf(PhaseBannerState);
			expect(holding()).toBe(false);

			dismissBanner();
			frame(0);

			expect(holding()).toBe(true);
		});

		test("The first enemy is planned for and the cursor put on it", () => {
			handOver();
			frame(0); // takes the map
			frame(0); // picks Hasan

			expect(action("hasan")).toMatchObject({ step: EnemyActionStep.FOCUS });
			expect(cursorAt()).toStrictEqual({ column: 4, row: 14 });
			expect(action("besnik")).toBeNull();
		});

		test("Each enemy walks, strikes and is spent, and the turn comes back to the player", () => {
			handOver();

			// Hasan starts four tiles from the army - he closes and swings.
			frames(() => fights.length > 0);
			expect(fights[0].attackerId).toBe("hasan");
			expect(sheet(fights[0].attackerId).inventory.some((entry) => entry.id === fights[0].weaponId)).toBe(true);

			const defender = tile(fights[0].defenderId);
			const attacker = tile("hasan");
			expect(Math.abs(attacker.column - defender.column) + Math.abs(attacker.row - defender.row)).toBe(1);

			// Once it lands Hasan is spent, and Besnik's turn comes.
			frames(() => action("besnik") !== null);
			expect(unit("hasan") === null || sheet("hasan").hasMoved).toBe(true);
			expect(holding()).toBe(true);

			// The phase runs out of units and the counter turns over.
			frames(() => turn().phase === UnitFaction.PLAYER);
			expect(turn()).toMatchObject({ number: 2, phase: UnitFaction.PLAYER, ending: false });
			expect(stateManager.getCurrentStates().some((state) => state instanceof EnemyPhaseState)).toBe(false);
			expect(stateManager.peek()).toBeInstanceOf(PhaseBannerState);

			for (const survivor of unitsInWorld(world)) {
				expect(survivor.getComponent(UnitComponent).read().hasMoved).toBe(false);
				expect(survivor.hasComponent(EnemyActionComponent)).toBe(false);
			}

			// Only enemies swung, and each at most once.
			expect(fights.map((fight) => sheet(fight.attackerId).faction)).toEqual(fights.map(() => UnitFaction.ENEMY));
			expect(new Set(fights.map((fight) => fight.attackerId)).size).toBe(fights.length);
		});

		test("Anything pushed over the phase pauses it", () => {
			handOver();
			frame(0);
			frame(0);
			expect(action("hasan")).toMatchObject({ step: EnemyActionStep.FOCUS, elapsed: 0 });

			stateManager.push(OverlayStub);
			frame();
			frame();
			expect(action("hasan")).toMatchObject({ step: EnemyActionStep.FOCUS, elapsed: 0 });

			stateManager.pop();
			frame();
			expect(action("hasan")?.step).not.toBe(EnemyActionStep.FOCUS);
		});

		test("A holding enemy strikes only from where it stands, so with nobody in reach it never moves", () => {
			assets.setJson(DEPLOYMENT_ASSET, {
				...deployment,
				units: deployment.units.map((placement) => (placement.unit === "hasan" ? { ...placement, behaviour: "hold" } : placement))
			});
			eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
			eventBus.processQueue();
			eventBus.processQueue();
			dismissBanner();

			handOver();
			frames(() => turn().phase === UnitFaction.PLAYER);

			expect(tile("hasan")).toStrictEqual({ column: 4, row: 14 });
			expect(fights.some((fight) => fight.attackerId === "hasan")).toBe(false);
		});

		test("With nobody left to move, the phase ends itself", () => {
			handOver();
			frame(0); // takes the map

			for (const enemy of unitsOfFaction(unitsInWorld(world), UnitFaction.ENEMY)) {
				world.unregisterEntity(enemy);
			}

			frames(() => turn().phase === UnitFaction.PLAYER);
			expect(turn().number).toBe(2);
			expect(fights).toHaveLength(0);
			expect(stateManager.getCurrentStates().some((state) => state instanceof EnemyPhaseState)).toBe(false);
		});

		test("An enemy side with nobody on the map is passed over entirely", () => {
			for (const enemy of unitsOfFaction(unitsInWorld(world), UnitFaction.ENEMY)) {
				world.unregisterEntity(enemy);
			}

			eventBus.dispatch("turn:end", {});
			frame();

			expect(turn()).toMatchObject({ number: 2, phase: UnitFaction.PLAYER });
			expect(holding()).toBe(false);
		});
	});
});
