import { test, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";
import { World } from "@/core/ecs/World";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { i18n } from "@/core/i18n/I18n";
import { InputDevice } from "@/core/input/InputDevice";
import { seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { AIFeature } from "@/game/ai/AIFeature";
import { ChainFeature } from "@/game/chain/ChainFeature";
import { ChainComponent, ChainData } from "@/game/chain/components/ChainComponent";
import { ChainState } from "@/game/chain/states/ChainState";
import { ChainRenderSystem } from "@/game/chain/systems/ChainRenderSystem";
import { ChainSystem } from "@/game/chain/systems/ChainSystem";
import { CHAIN_MENU, ChainTheme } from "@/game/chain/view/ChainTheme";
import { CombatFeature } from "@/game/combat/CombatFeature";
import { BattleAnimationSystem } from "@/game/combat/systems/BattleAnimationSystem";
import { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { MapState } from "@/game/map/states/MapState";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { COMMAND_MENU, UnitMenuRow } from "@/game/movement/view/UnitMenus";
import { ObjectiveComponent, Outcome } from "@/game/objective/components/ObjectiveComponent";
import { WinCondition } from "@/game/objective/content/Objectives";
import { ObjectiveFeature } from "@/game/objective/ObjectiveFeature";
import { OutcomeState } from "@/game/objective/states/OutcomeState";
import { ObjectiveSystem } from "@/game/objective/systems/ObjectiveSystem";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * Fight 3 end to end on the shipped deployment: the bar goes on with the map,
 * strikes wear it down to its last point, the command menu offers the chain and
 * three strikes play out through the ordinary fight, the first of them breaking
 * the shield. The battle is won, and the banner waits for the last strike.
 */
suite("Chain Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);

	class MapStub extends GameState {
		public static readonly type = MapState.type;
		onEnter() {
			eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 31, rows: 17, scenario: "bellum-soldier" });
		}
		onExit() {
			eventBus.dispatch("map:closed", {});
		}
		onPause() {}
		onResume() {}
	}

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	const display = new Display("chain-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	let features: { install(): void; uninstall(): void }[] = [];
	let map: Entity;
	let objectiveSystem: ObjectiveSystem;
	let chainSystem: ChainSystem;
	let finished = 0;
	let unsubscribe = () => {};

	const unit = (id: string) => unitById(unitsInWorld(world), id) as Entity;
	const sheet = (id: string) => unit(id).getComponent(UnitComponent).read();
	const chain = () => (world.entityWith(ChainComponent) as Entity).getComponent(ChainComponent).read();
	const objective = () => (world.entityWith(ObjectiveComponent) as Entity).getComponent(ObjectiveComponent).read();
	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();
	const moveTo = (id: string, column: number, row: number) => unit(id).getComponent(GridPositionComponent).update({ column, row });

	const settle = () => {
		for (let pass = 0; pass < 4; pass++) {
			eventBus.processQueue();
		}
	};

	const dismissBanner = () => {
		if (stateManager.peek() instanceof PhaseBannerState) {
			stateManager.pop();
		}
	};

	/** Stands the soldier in the open with three children beside him and one of them mid-move, the bar at its last point. */
	const formation = () => {
		const component = (world.entityWith(ChainComponent) as Entity).getComponent(ChainComponent);

		component.update({ ...component.read(), shield: 1 });
		moveTo("dardan-niveli", 15, 11);
		moveTo("hasan-eyletmez", 14, 12);
		moveTo("leona-kaori", 16, 12);
		moveTo("maksimo-auditore", 2, 2);
		moveTo("ivan-grussinskin", 2, 3);
		moveTo("lina-yukari", 2, 4);
		unit("dardan-niveli").addComponent(PendingMoveComponent, { originColumn: 15, originRow: 11 });
	};

	const chooseChain = () => {
		eventBus.dispatch("ui:menuConfirmed", { menu: COMMAND_MENU, row: UnitMenuRow.CHAIN, index: 0, item: i18n("menu.chain") });
		settle();
	};

	const confirmFormation = () => {
		eventBus.dispatch("ui:menuConfirmed", { menu: CHAIN_MENU, row: "hasan-eyletmez|leona-kaori", index: 0, item: "" });
		settle();
	};

	/** One frame: the queue, then the clocks in schedule order. */
	const frame = () => {
		eventBus.processQueue();
		objectiveSystem.execute(16, 0);
		chainSystem.execute();

		if (stateManager.peek() instanceof BattleAnimationState) {
			const animation = new BattleAnimationSystem(8).initialize();

			animation.execute(100_000);
			animation.dispose();
		}
	};

	beforeEach(() => {
		seedRandom(1);
		stateManager.clear();
		stateManager.registerState(MapStub);

		map = world.createEntity();
		map.addComponent(GridComponent, GridComponent.of(parseTileMap(new Array(17).fill(".".repeat(31))), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		const cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 15, row: 10 });

		stateManager.switch(MapStub);

		const units = new UnitsFeature();
		const ui = new UIFeature({ demo: false });
		const turn = new TurnFeature({ dependencies: [units] });
		const combat = new CombatFeature({ dependencies: [units] });
		const movement = new MovementFeature({ dependencies: [units, ui] });
		const chainFeature = new ChainFeature({ dependencies: [units, ui, combat, movement] });
		const ai = new AIFeature({ dependencies: [units, turn, combat, movement] });
		const objectiveFeature = new ObjectiveFeature({ dependencies: [units, turn, ai] });

		features = [units, ui, turn, combat, movement, chainFeature, ai, objectiveFeature];

		for (const feature of features) {
			feature.install();
		}

		objectiveSystem = new ObjectiveSystem(6).initialize();
		chainSystem = new ChainSystem(8).initialize();
		finished = 0;
		unsubscribe = eventBus.subscribe("chain:finished", () => finished++);

		eventBus.processQueue();
		eventBus.processQueue();
		dismissBanner();
	});

	afterEach(() => {
		unsubscribe();
		objectiveSystem.dispose();
		chainSystem.dispose();

		for (const feature of [...features].reverse()) {
			feature.uninstall();
		}

		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventBus.processQueue();
	});

	test("The sheet gives the soldier his bar, his floor and the battle its objective", () => {
		expect(chain()).toMatchObject({ targetId: "red-soldier", shield: 9, maxShield: 9 });
		expect(sheet("red-soldier").hpFloor).toBe(1);
		expect(objective()).toMatchObject({ win: WinCondition.CHAIN, target: "red-soldier", atLeast: 3 });
	});

	test("The children have no floor", () => {
		expect(sheet("dardan-niveli").hpFloor).toBe(0);
	});

	test("Landed strikes wear the bar down, in either direction, and note who attacked", () => {
		const fought = { attackerSwung: true, defenderSwung: true, attackerDealtDamage: false, defenderDealtDamage: false, attackerDefeated: false, defenderDefeated: false };

		eventBus.dispatch("combat:fought", { attackerId: "hasan-eyletmez", defenderId: "red-soldier", attackerHits: 1, defenderHits: 1, ...fought });
		settle();
		expect(chain()).toMatchObject({ shield: 8, struck: ["hasan-eyletmez"] });

		eventBus.dispatch("combat:fought", { attackerId: "dardan-niveli", defenderId: "red-soldier", attackerHits: 0, defenderHits: 1, ...fought });
		settle();
		expect(chain().shield).toBe(8);

		// His own blow on the enemy phase: the child's counter is what lands on him.
		eventBus.dispatch("combat:fought", { attackerId: "red-soldier", defenderId: "leona-kaori", attackerHits: 1, defenderHits: 1, ...fought });
		settle();
		expect(chain()).toMatchObject({ shield: 7, struck: ["hasan-eyletmez", "dardan-niveli"] });
	});

	test("A new turn forgets who attacked", () => {
		const component = (world.entityWith(ChainComponent) as Entity).getComponent(ChainComponent);

		component.update({ ...component.read(), struck: ["hasan-eyletmez"] });
		eventBus.dispatch("turn:changed", { number: 2, phase: sheet("dardan-niveli").faction });
		eventBus.processQueue();
		dismissBanner();

		expect(chain().struck).toStrictEqual([]);
	});

	test("The chain row opens a preview, and backing out brings the command menu back", () => {
		formation();
		chooseChain();

		expect(menu()).toMatchObject({ id: CHAIN_MENU, items: ["Dardan > Hasan > Leona"] });

		stateManager.pop();
		eventBus.dispatch("ui:menuCancelled", { menu: CHAIN_MENU });
		settle();

		expect(menu()?.id).toBe(COMMAND_MENU);
		expect(sheet("hasan-eyletmez").hasMoved).toBe(false);
	});

	test("Three strikes play out, the first breaks the shield, and the banner waits for the last", () => {
		formation();
		chooseChain();
		confirmFormation();

		expect(stateManager.peek()).toBeInstanceOf(ChainState);
		expect(objective().outcome).toBe(Outcome.VICTORY);
		expect(sheet("hasan-eyletmez").hasMoved).toBe(true);
		expect(sheet("leona-kaori").hasMoved).toBe(true);

		const attackers: string[] = [];
		const stop = eventBus.subscribe("combat:fought", (event) => attackers.push(event.attackerId));

		for (let index = 0; index < 40 && finished === 0; index++) {
			frame();

			// The state holding the map is what keeps the banner off it until the end.
			if (stateManager.getCurrentStates().some((state) => state instanceof ChainState)) {
				expect(stateManager.getCurrentStates().some((state) => state instanceof OutcomeState)).toBe(false);
			}
		}

		stop();

		expect(attackers).toStrictEqual(["dardan-niveli", "hasan-eyletmez", "leona-kaori"]);
		expect(chain()).toMatchObject({ shield: 0, strikers: [], current: "" });
		expect(sheet("red-soldier").currentHP).toBeGreaterThanOrEqual(1);
		expect(finished).toBe(1);

		frame();

		expect(stateManager.peek()).toBeInstanceOf(OutcomeState);
		expect(objective().outcome).toBe(Outcome.VICTORY);
	});

	test("The battle is lost when fewer than three children are left", () => {
		for (const id of ["maksimo-auditore", "ivan-grussinskin", "lina-yukari"]) {
			eventBus.dispatch("unit:died", { unitId: id });
			settle();
			expect(objective().outcome).toBe("");
		}

		eventBus.dispatch("unit:died", { unitId: "leona-kaori" });
		settle();

		expect(objective().outcome).toBe(Outcome.DEFEAT);
	});

	test("Dardan falling loses it at once", () => {
		eventBus.dispatch("unit:died", { unitId: "dardan-niveli" });
		settle();

		expect(objective().outcome).toBe(Outcome.DEFEAT);
	});

	test("A striker who no longer reaches is passed over, and nobody is handed on while a strike is fought", () => {
		formation();
		chooseChain();
		confirmFormation();

		// Hasan is shoved off before his turn comes: nothing he carries reaches the soldier from there.
		moveTo("hasan-eyletmez", 2, 5);

		const confirmed: string[] = [];
		const stop = eventBus.subscribe("combat:confirmed", (event) => confirmed.push(event.attackerId));

		chainSystem.execute(); // Dardan's strike is handed to the combat feature
		chainSystem.execute(); // still his: the next striker waits
		expect(chain().current).toBe("dardan-niveli");

		for (let index = 0; index < 40 && finished === 0; index++) {
			frame();
		}

		stop();

		expect(confirmed).toStrictEqual(["dardan-niveli", "leona-kaori"]);
		expect(chain()).toMatchObject({ strikers: [], current: "" });
		expect(finished).toBe(1);
	});

	suite("Shield bar", () => {
		let renderer: ChainRenderSystem;
		let drawn: { rectangle: Rectangle; color: unknown }[];

		/** One render frame: the map's screen position resolved, then the bar drawn - every rectangle noted with the colour it was filled in. */
		const render = () => {
			const background = display.getLayer("background");
			let color: unknown = null;

			const fill = vi.spyOn(background, "fillColor").mockImplementation(function (this: typeof background, next) {
				color = next;
				return this;
			});
			const rectangle = vi.spyOn(background, "fillRectangle").mockImplementation(function (this: typeof background, next) {
				drawn.push({ rectangle: next, color });
				return this;
			});

			world.getSystem(TransformSystem).execute();
			renderer.execute();

			fill.mockRestore();
			rectangle.mockRestore();
		};

		const box = (rectangle: Rectangle) => [rectangle.getPosition().x, rectangle.getPosition().y, rectangle.getWidth(), rectangle.getHeight()];
		const wear = (changes: Partial<ChainData>) => {
			const component = (world.entityWith(ChainComponent) as Entity).getComponent(ChainComponent);
			component.update({ ...component.read(), ...changes } as ChainData);
		};

		beforeEach(() => {
			world.registerSystem(TransformSystem, 0);
			renderer = new ChainRenderSystem(18).initialize();
			drawn = [];
		});

		afterEach(() => {
			renderer.dispose();
			world.unregisterSystem(TransformSystem);
		});

		test("The bar runs across the top of the soldier's tile, one segment per point, the worn ones dark", () => {
			wear({ shield: 3 });
			render();

			// The soldier stands on 15,12 of a 24px grid at the origin: his tile starts at 360,288.
			// Inset 2 leaves 24 - 2·2 = 20px; nine segments share it with eight 1px gaps: (20 - 8) / 9 = 4/3 each.
			expect(drawn).toHaveLength(1 + 9);
			expect(box(drawn[0].rectangle)).toStrictEqual([361, 289, 22, 7]); // the outline, a pixel round the bar
			expect(drawn[0].color).toBe(ChainTheme.outline);

			expect(drawn[1].rectangle.getPosition().x).toBeCloseTo(362);
			expect(drawn[1].rectangle.getPosition().y).toBe(290);
			expect(drawn[1].rectangle.getWidth()).toBeCloseTo(4 / 3);
			expect(drawn[1].rectangle.getHeight()).toBe(5);
			// The last segment ends where the bar does: 362 + 8·(4/3 + 1) + 4/3 = 382.
			expect(drawn[9].rectangle.getPosition().x + drawn[9].rectangle.getWidth()).toBeCloseTo(382);

			const colors = drawn.slice(1).map((entry) => entry.color);
			expect(colors).toStrictEqual([...new Array(3).fill(ChainTheme.point), ...new Array(6).fill(ChainTheme.spent)]);
		});

		test("No bar is drawn without a shield to show or a target on the map", () => {
			wear({ maxShield: 0, shield: 0 });
			render();
			expect(drawn).toStrictEqual([]);

			wear({ maxShield: 9, shield: 9, targetId: "nobody" });
			render();
			expect(drawn).toStrictEqual([]);
		});
	});
});
