import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { ExperienceGainedEvent } from "@/game.events";
import { syncGameOptions } from "@/game/options/GameSettings";
import { CombatFeature } from "@/game/combat/CombatFeature";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";
import { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";
import { ForecastState } from "@/game/combat/states/ForecastState";
import { BattleAnimationSystem } from "@/game/combat/systems/BattleAnimationSystem";
import { ForecastSystem } from "@/game/combat/systems/ForecastSystem";
import { ExperienceComponent, ExperiencePhase } from "@/game/experience/components/ExperienceComponent";
import { ExperienceFeature } from "@/game/experience/ExperienceFeature";
import { experienceDuration, experienceFillDuration } from "@/game/experience/view/ExperienceBar";
import { levelUpDuration, levelUpFrame } from "@/game/experience/view/LevelUpPanel";
import { ConfirmLevelUpCommand } from "@/game/experience/commands/ExperienceCommands";
import { KILL_BONUS } from "@/game/experience/rules/Experience";
import { ExperienceState } from "@/game/experience/states/ExperienceState";
import { ExperienceSystem } from "@/game/experience/systems/ExperienceSystem";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitMenuRow } from "@/game/movement/view/UnitMenus";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { UIFeature } from "@/game/ui/UIFeature";
import { getWeapon } from "@/game/units/content/UnitCatalog";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitById } from "@/game/units/rules/UnitLookup";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import { i18n } from "@/core/i18n/I18n";

/**
 * Experience end to end: a fight is scored the moment it is decided, the bar
 * goes up once the animation has landed, and a level wraps it into the
 * level-up notice. The deployment puts Dardan on 4,10 and Hasan, the enemy, on
 * 4,14, both level 1 in base classes - so a hit is worth 10 and a kill 25.
 */
suite("Experience Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("experience-flow-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let combat: CombatFeature;
	let experience: ExperienceFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;
	let gained: ExperienceGainedEvent[];
	let shown: string[];
	let unsubscribe: (() => void)[] = [];

	const unit = (id: string) => unitById(unitsInWorld(world), id);
	const sheet = (id: string) => (unit(id) as Entity).getComponent(UnitComponent).read();
	const patch = (id: string, changes: Partial<UnitData>) => {
		const component = (unit(id) as Entity).getComponent(UnitComponent);
		component.update({ ...component.read(), ...changes } as UnitData);
	};
	const forecast = () => stateManager.getState(ForecastState).getForecast()?.getComponent(ForecastComponent);
	const display = () => stateManager.getState(ExperienceState).getDisplay()?.getComponent(ExperienceComponent).read();

	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8).initialize();
		walkSystem.execute(10_000);
		eventBus.processQueue();
		walkSystem.dispose();
	};

	/** Pick Dardan up, walk him to (column,row), then "Attack" the nearest enemy and confirm the forecast. */
	const attackFrom = (column: number, row: number) => {
		eventBus.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventBus.processQueue();
		eventBus.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventBus.processQueue();
		finishWalk();

		eventBus.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.ATTACK, index: 0, item: i18n("menu.attack") });
		eventBus.processQueue();
		eventBus.processQueue(); // combat:requested
		forecast()?.update({ ...forecast()!.read(), phase: "forecast", weaponIndex: 0, confirmed: true });

		const system = new ForecastSystem(10).initialize();
		system.execute(16, 0);
		eventBus.processQueue(); // combat:confirmed -> resolve, combat:fought
		eventBus.processQueue(); // combat:fought -> the scoring
		eventBus.processQueue(); // experience:gained
		system.dispose();
	};

	/** Runs the battle animation to its end so `combat:resolved` fires and the bar goes up. */
	const finishBattleAnimation = () => {
		const system = new BattleAnimationSystem(8).initialize();
		system.execute(10_000);
		eventBus.processQueue(); // unit:died, combat:resolved -> the bar / the spend
		eventBus.processQueue(); // unit:acted
		system.dispose();
	};

	/** Runs the bar's clock forward by `elapsed` milliseconds and settles what it reports. */
	const pumpBar = (elapsed: number) => {
		const system = new ExperienceSystem(8).initialize();
		system.execute(elapsed, 0);
		eventBus.processQueue(); // experience:shown -> the next bar
		system.dispose();
	};

	beforeEach(() => {
		seedRandom(1);
		// The battle-animations switch has to exist for the bar and the panel to play out rather than start finished.
		syncGameOptions();
		stateManager.clear();
		gained = [];
		shown = [];

		map = world.createEntity();
		map.addComponent(GridComponent, GridComponent.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		units = new UnitsFeature();
		units.install();
		ui = new UIFeature({ demo: false });
		ui.install();
		combat = new CombatFeature({ dependencies: [units] });
		combat.install();
		experience = new ExperienceFeature({ dependencies: [units, ui] });
		experience.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventBus.processQueue();

		unsubscribe = [eventBus.subscribe("experience:gained", (event) => gained.push(event)), eventBus.subscribe("experience:shown", (event) => shown.push(event.unitId))];

		// A sure hit that never kills a healthy Hasan: the fight, not the dice, is under test.
		patch("dardan", { stats: { ...sheet("dardan").stats, strength: 6, dexterity: 40 } });
		patch("hasan", { stats: { ...sheet("hasan").stats, speed: 1 } });
	});

	afterEach(() => {
		for (const stop of unsubscribe) {
			stop();
		}

		movement.uninstall();
		experience.uninstall();
		combat.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventBus.processQueue();
	});

	test("A hit is scored the moment the fight is decided; the bar waits for the animation", () => {
		attackFrom(4, 13);

		// The points landed with the fight's HP, before the animation.
		expect(stateManager.peek()).toBeInstanceOf(BattleAnimationState);
		expect(sheet("dardan").experience).toBe(10);
		expect(sheet("dardan").level).toBe(1);
		expect(gained).toHaveLength(1);
		expect(gained[0]).toMatchObject({ unitId: "dardan", gained: 10, levelUp: null });
		// The enemy earns nothing, whatever it did.
		expect(sheet("hasan").experience).toBe(0);

		finishBattleAnimation();

		expect(stateManager.peek()).toBeInstanceOf(ExperienceState);
		expect(display()).toMatchObject({ unitId: "dardan", fromLevel: 1, fromExperience: 0, gained: 10, toLevel: 0, phase: ExperiencePhase.FILLING });
		// Spent underneath, the way "Wait" would have.
		expect(sheet("dardan").hasMoved).toBe(true);
	});

	test("The bar fills point by point, holds, and goes - reporting that it was seen", () => {
		attackFrom(4, 13);
		finishBattleAnimation();

		const data = display()!;
		pumpBar(experienceFillDuration(data) / 2);
		expect(stateManager.peek()).toBeInstanceOf(ExperienceState);
		expect(shown).toStrictEqual([]);

		pumpBar(experienceDuration(data));
		expect(stateManager.peek()).toBeNull();
		expect(shown).toStrictEqual(["dardan"]);
	});

	test("A kill is worth the mode's 15 more, and the hundredth point is a level: the bar gives way to the level-up panel", () => {
		patch("hasan", { currentHP: 1 });
		patch("dardan", { experience: 90 });

		attackFrom(4, 13);

		const dardan = sheet("dardan");
		expect(dardan.level).toBe(2);
		expect(dardan.experience).toBe(90 + 10 + KILL_BONUS - 100);
		expect(gained[0]).toMatchObject({ unitId: "dardan", gained: 25 });
		expect(gained[0].levelUp?.level).toBe(2);

		finishBattleAnimation();
		expect(unit("hasan")).toBeNull();
		expect(display()).toMatchObject({ fromLevel: 1, fromExperience: 90, gained: 25, toLevel: 2, gains: gained[0].levelUp?.gains, phase: ExperiencePhase.FILLING });
		// The panel counts up from where the stats stood before the level.
		expect(display()?.statsBefore.hp).toBe(20);

		// The bar fills and wraps; the level-up panel takes over with a fresh clock - no popup, nothing on top of the bar.
		pumpBar(experienceFillDuration(display()!));
		expect(stateManager.peek()).toBeInstanceOf(ExperienceState);
		expect(display()).toMatchObject({ phase: ExperiencePhase.LEVEL_UP, elapsed: 0, closed: false });

		// The stats light up one by one; the panel is not complete until the last has.
		pumpBar(levelUpDuration(display()!) - 1);
		expect(levelUpFrame(display()!, display()!.elapsed).complete).toBe(false);
		expect(stateManager.peek()).toBeInstanceOf(ExperienceState);

		pumpBar(1);
		expect(levelUpFrame(display()!, display()!.elapsed).complete).toBe(true);
		// It waits for the player, however long.
		pumpBar(5_000);
		expect(stateManager.peek()).toBeInstanceOf(ExperienceState);

		// The press - what ConfirmLevelUpCommand marks - and the panel comes down.
		const component = stateManager.getState(ExperienceState).getDisplay()!.getComponent(ExperienceComponent);
		component.update({ ...component.read(), closed: true });
		pumpBar(16);
		expect(stateManager.peek()).toBeNull();
		expect(shown).toStrictEqual(["dardan"]);
	});

	test("A press during the level-up hurries every gain onto the panel; the next takes it down", () => {
		patch("hasan", { currentHP: 1 });
		patch("dardan", { experience: 90 });

		attackFrom(4, 13);
		finishBattleAnimation();
		pumpBar(experienceFillDuration(display()!));
		expect(display()?.phase).toBe(ExperiencePhase.LEVEL_UP);

		const entity = stateManager.getState(ExperienceState).getDisplay()!;
		const command = new ConfirmLevelUpCommand();
		const press = () => (command as unknown as { action: (elapsed: number, frame: number, context: { display: Entity }) => void }).action(16, 0, { display: entity });

		press();
		expect(display()?.elapsed).toBe(levelUpDuration(display()!));
		expect(levelUpFrame(display()!, display()!.elapsed).complete).toBe(true);
		expect(display()?.closed).toBe(false);

		press();
		expect(display()?.closed).toBe(true);
		pumpBar(16);
		expect(stateManager.peek()).toBeNull();
	});

	test("Raising a staff is worth the staff's own value", () => {
		patch("teuta", { experience: 5 });

		eventBus.dispatch("staff:resolved", { unitId: "teuta", targetId: "dardan", staffId: "heal", healed: 8 });
		eventBus.processQueue(); // staff:resolved -> the scoring
		eventBus.processQueue(); // experience:gained

		expect(sheet("teuta").experience).toBe(5 + getWeapon("heal").experience);
		expect(gained).toHaveLength(1);
		expect(gained[0]).toMatchObject({ unitId: "teuta", gained: 11, levelUp: null });
		expect(stateManager.peek()).toBeInstanceOf(ExperienceState);
		expect(display()).toMatchObject({ unitId: "teuta", fromExperience: 5, gained: 11 });
	});

	test("Both sides of a fight are scored, a player defender included, and their bars queue up", () => {
		// Elira is attacked by Hasan: she counters and hurts him.
		eventBus.dispatch("combat:fought", {
			attackerId: "hasan",
			defenderId: "elira",
			attackerSwung: true,
			defenderSwung: true,
			attackerDealtDamage: true,
			defenderDealtDamage: true,
			attackerDefeated: false,
			defenderDefeated: false
		});
		eventBus.processQueue();

		expect(sheet("hasan").experience).toBe(0);
		expect(sheet("elira").experience).toBe(10);

		// And a fight where two player units... cannot happen; but the queue is exercised
		// by a player-versus-player-scored resolve all the same.
		eventBus.dispatch("combat:fought", {
			attackerId: "dardan",
			defenderId: "elira",
			attackerSwung: true,
			defenderSwung: false,
			attackerDealtDamage: false,
			defenderDealtDamage: false,
			attackerDefeated: false,
			defenderDefeated: false
		});
		eventBus.processQueue();
		expect(sheet("dardan").experience).toBe(1); // a swing that never landed
		expect(sheet("elira").experience).toBe(10); // no swing, nothing

		eventBus.dispatch("combat:resolved", { attackerId: "hasan", defenderId: "elira", attackerDefeated: false, defenderDefeated: false });
		eventBus.dispatch("combat:resolved", { attackerId: "dardan", defenderId: "elira", attackerDefeated: false, defenderDefeated: false });
		eventBus.processQueue();

		expect(display()?.unitId).toBe("elira");
		pumpBar(experienceDuration(display()!));
		expect(display()?.unitId).toBe("dardan");
		pumpBar(experienceDuration(display()!));
		expect(stateManager.peek()).toBeNull();
		expect(shown).toStrictEqual(["elira", "dardan"]);
	});
});
