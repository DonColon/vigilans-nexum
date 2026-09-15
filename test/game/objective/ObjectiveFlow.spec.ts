import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { i18n } from "@/core/i18n/I18n";
import { InputDevice } from "@/core/input/InputDevice";
import { seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { ObjectiveDecidedEvent } from "@/game.events";
import { AIFeature } from "@/game/ai/AIFeature";
import { EnemyPhaseState } from "@/game/ai/states/EnemyPhaseState";
import { EnemyPhaseSystem } from "@/game/ai/systems/EnemyPhaseSystem";
import { CombatFeature } from "@/game/combat/CombatFeature";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { MapState } from "@/game/map/states/MapState";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { UnitMenuRow } from "@/game/movement/view/UnitMenus";
import { ObjectiveComponent, Outcome } from "@/game/objective/components/ObjectiveComponent";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
import { WinCondition } from "@/game/objective/content/Objectives";
import { ObjectiveFeature } from "@/game/objective/ObjectiveFeature";
import { OutcomeState } from "@/game/objective/states/OutcomeState";
import { ObjectiveSystem } from "@/game/objective/systems/ObjectiveSystem";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { TurnSystem } from "@/game/turn/systems/TurnSystem";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { DEPLOYMENT_ASSET, DeploymentDocument } from "@/game/units/content/Deployments";
import { unitById, unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The objective end to end: read off the sheet with the map, decided after a
 * death or a seize, shown once the map is quiet - holding the turns and the
 * enemy phase under the banner - and, acknowledged, the battle starts over.
 */
suite("Objective Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	/**
	 * Stands in for the battle map: matched by its type, and it announces
	 * itself the way the real one does, so starting over rebuilds the battle.
	 */
	class MapStub extends GameState {
		public static readonly type = MapState.type;
		onEnter() {
			eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		}
		onExit() {
			eventBus.dispatch("map:closed", {});
		}
		onPause() {}
		onResume() {}
	}

	/** Anything pushed over the map - an experience bar, a popup. */
	class OverlayStub extends GameState {
		public static readonly type = "objective-overlay-stub";
		onEnter() {}
		onExit() {}
		onPause() {}
		onResume() {}
	}

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("objective-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));
	const deployment = assets.getJson<DeploymentDocument>(DEPLOYMENT_ASSET);

	let features: { install(): void; uninstall(): void }[] = [];
	let map: Entity;
	let cursor: Entity;
	let decided: ObjectiveDecidedEvent[] = [];
	let unsubscribe = () => {};
	/** Kept across frames, the way the game keeps it, so its queries lag entity changes by a frame as they do there. */
	let objectiveSystem: ObjectiveSystem | null = null;

	const unit = (id: string) => unitById(unitsInWorld(world), id);
	const sheet = (id: string) => (unit(id) as Entity).getComponent(UnitComponent).read();
	const objective = () => (world.entityWith(ObjectiveComponent) as Entity).getComponent(ObjectiveComponent).read();
	const turn = () => (world.entityWith(TurnComponent) as Entity).getComponent(TurnComponent).read();
	const banner = () => (stateManager.getState(OutcomeState) as OutcomeState).getBanner()?.getComponent(OutcomeComponent);
	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();

	const run = <T extends { execute(elapsed: number, frame: number): void; dispose(): void }>(system: T, elapsed: number) => {
		system.execute(elapsed, 0);
		system.dispose();
	};

	/**
	 * One frame, the way the game runs one: the queue is drained once, then the
	 * clocks run in schedule order - the objective's ahead of the turn's and the
	 * enemy's. Anything dispatched during the frame lands on the next.
	 */
	const frame = (elapsed = 1000) => {
		eventBus.processQueue();
		objectiveSystem?.execute(elapsed, 0);
		run(new TurnSystem(8).initialize(), elapsed);
		run(new EnemyPhaseSystem(8).initialize(), elapsed);
		run(new UnitWalkSystem(8).initialize(), elapsed);
	};

	const dismissBanner = () => {
		if (stateManager.peek() instanceof PhaseBannerState) {
			stateManager.pop();
		}
	};

	/** Lets every queued event and whatever it dispatches in turn land. */
	const settle = () => {
		for (let pass = 0; pass < 4; pass++) {
			eventBus.processQueue();
		}
	};

	/** Takes the unit off the map the way a fight does, and lets the fallout land. */
	const fell = (id: string) => {
		eventBus.dispatch("unit:died", { unitId: id });
		settle();
	};

	/** Puts a sheet with this objective in the bundle - read when the map opens. */
	const setObjective = (objective: DeploymentDocument["objective"]) => {
		assets.setJson(DEPLOYMENT_ASSET, { ...deployment, objective });
	};

	const open = () => {
		map = world.createEntity();
		map.addComponent(GridComponent, GridComponent.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		stateManager.switch(MapStub); // queues map:ready

		const units = new UnitsFeature();
		const ui = new UIFeature({ demo: false });
		const turnFeature = new TurnFeature({ dependencies: [units] });
		const combat = new CombatFeature({ dependencies: [units] });
		const movement = new MovementFeature({ dependencies: [units, ui] });
		const ai = new AIFeature({ dependencies: [units, turnFeature, combat, movement] });
		const objectiveFeature = new ObjectiveFeature({ dependencies: [units, turnFeature, ai] });

		features = [units, ui, turnFeature, combat, movement, ai, objectiveFeature];

		for (const feature of features) {
			feature.install();
		}

		objectiveSystem = new ObjectiveSystem(6).initialize();

		eventBus.processQueue(); // map:ready - the battle is set up
		eventBus.processQueue(); // turn:changed - the player's banner
		dismissBanner();
	};

	beforeEach(() => {
		seedRandom(1);
		stateManager.clear();
		stateManager.registerState(MapStub);
		stateManager.registerState(OverlayStub);

		decided = [];
		unsubscribe = eventBus.subscribe("objective:decided", (event) => decided.push(event));
	});

	afterEach(() => {
		unsubscribe();
		objectiveSystem?.dispose();
		objectiveSystem = null;
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

	test("The objective is read off the deployment sheet when the map opens", () => {
		open();

		// The skirmish is a seize of the fort's throne.
		expect(objective()).toStrictEqual({ win: WinCondition.SEIZE, seizeColumn: 12, seizeRow: 3, outcome: "" });
	});

	test("A rout is won when the last enemy falls; the banner waits for whatever is over the map", () => {
		setObjective({ win: "rout" });
		open();

		// The kill's experience bar goes up in the same breath as the death lands.
		stateManager.push(OverlayStub);
		fell("hasan");
		expect(decided).toHaveLength(0);

		fell("besnik");
		expect(decided).toEqual([expect.objectContaining({ outcome: Outcome.VICTORY })]);
		expect(objective().outcome).toBe(Outcome.VICTORY);
		expect(turn().over).toBe(true);

		frame();
		expect(stateManager.peek()).toBeInstanceOf(OverlayStub);

		stateManager.pop();
		frame();
		expect(stateManager.peek()).toBeInstanceOf(OutcomeState);
		expect(banner()?.read()).toMatchObject({ outcome: Outcome.VICTORY, turn: 1, acknowledged: false });
	});

	test("A decided battle turns no more, even once every unit has acted", () => {
		setObjective({ win: "rout" });
		open();

		fell("hasan");
		fell("besnik");

		for (const player of unitsOfFaction(unitsInWorld(world), UnitFaction.PLAYER)) {
			const component = player.getComponent(UnitComponent);
			component.update({ ...component.read(), hasMoved: true });
		}

		eventBus.dispatch("unit:acted", { unitId: "dardan" });
		frame();
		frame();

		expect(turn()).toMatchObject({ number: 1, phase: UnitFaction.PLAYER, ending: true, over: true });
		expect(stateManager.peek()).toBeInstanceOf(OutcomeState);
	});

	test("The commander falling in the enemy phase is a defeat, and the phase holds under the banner", () => {
		open();

		eventBus.dispatch("turn:end", {});
		frame(); // the turn turns over
		frame(); // the enemy's banner goes up
		dismissBanner();
		frame(0); // the enemy phase takes the map
		expect(stateManager.peek()).toBeInstanceOf(EnemyPhaseState);

		fell("dardan");
		expect(decided).toEqual([expect.objectContaining({ outcome: Outcome.DEFEAT })]);

		frame();
		expect(stateManager.peek()).toBeInstanceOf(OutcomeState);
		expect(stateManager.getCurrentStates().some((state) => state instanceof EnemyPhaseState)).toBe(true);

		// Frames pass and the enemy does not move on.
		const hasanTile = { ...(unit("hasan") as Entity).getComponent(GridPositionComponent).read() };
		frame();
		frame();
		expect((unit("hasan") as Entity).getComponent(GridPositionComponent).read()).toStrictEqual(hasanTile);
		expect(turn()).toMatchObject({ number: 1, phase: UnitFaction.ENEMY, over: true });
	});

	test('The commander on the tile is offered "Seize" first, and claiming it wins the day', () => {
		setObjective({ win: "seize", column: 4, row: 8 });
		open();

		// Pick Dardan up at (4,10) and walk him onto the tile.
		eventBus.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventBus.processQueue();
		eventBus.dispatch("map:tileConfirmed", { column: 4, row: 8, terrain: "plain" });
		eventBus.processQueue();
		run(new UnitWalkSystem(8).initialize(), 10_000);
		eventBus.processQueue();

		expect(menu()?.items[0]).toBe(i18n("menu.seize"));

		eventBus.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.SEIZE, index: 0, item: i18n("menu.seize") });
		settle(); // seize:requested, then objective:decided

		expect(sheet("dardan").hasMoved).toBe(true);
		expect(decided).toEqual([expect.objectContaining({ outcome: Outcome.VICTORY })]);

		frame();
		expect(stateManager.peek()).toBeInstanceOf(OutcomeState);
	});

	test("Anyone but the commander on the tile is just standing there", () => {
		setObjective({ win: "seize", column: 4, row: 8 });
		open();

		// Elira at (5,10) to the tile.
		eventBus.dispatch("map:tileConfirmed", { column: 5, row: 10, terrain: "plain" });
		eventBus.processQueue();
		eventBus.dispatch("map:tileConfirmed", { column: 4, row: 8, terrain: "plain" });
		eventBus.processQueue();
		run(new UnitWalkSystem(8).initialize(), 10_000);
		eventBus.processQueue();

		expect(menu()?.items).not.toContain(i18n("menu.seize"));

		// And a seize asked for anyway is refused.
		eventBus.dispatch("seize:requested", { unitId: "elira" });
		settle();
		expect(decided).toHaveLength(0);
	});

	test("Acknowledging the banner starts the battle over", () => {
		setObjective({ win: "rout" });
		open();

		const events: string[] = [];
		const stop = [
			eventBus.subscribe("map:closed", () => events.push("closed")),
			eventBus.subscribe("map:ready", () => events.push("ready")),
			eventBus.subscribe("objective:acknowledged", () => events.push("acknowledged"))
		];

		fell("hasan");
		fell("besnik");
		frame();
		expect(stateManager.peek()).toBeInstanceOf(OutcomeState);

		// The banner holds until the player presses - the press is what the command marks.
		banner()?.update({ ...banner()!.read(), acknowledged: true });
		frame(); // acknowledged: the states come down and the map is entered again
		frame(); // map:closed and map:ready land - the battle is rebuilt

		expect(events).toStrictEqual(["acknowledged", "closed", "ready"]);

		// And it stays fresh: the old battle's outcome does not put the banner back up.
		frame();
		frame();
		expect(stateManager.getCurrentStates().some((state) => state instanceof OutcomeState)).toBe(false);

		// The map, and the new battle's opening banner over it - nothing of the old one.
		expect(stateManager.getCurrentStates().map((state) => (state.constructor as typeof GameState).type)).toStrictEqual([MapState.type, PhaseBannerState.type]);

		// A fresh battle: everyone back where they started, nothing decided, turn 1.
		expect(unit("hasan")).not.toBeNull();
		expect(unit("besnik")).not.toBeNull();
		expect(objective().outcome).toBe("");
		expect(turn()).toMatchObject({ number: 1, phase: UnitFaction.PLAYER, over: false });

		for (const unsubscribe of stop) {
			unsubscribe();
		}
	});
});
