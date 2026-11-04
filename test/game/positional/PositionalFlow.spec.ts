import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { EventHandler, EventNames } from "@/core/events/GameEvents";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { PositionalCancelledEvent, PositionalConfirmedEvent, PositionalRequestedEvent, PositionalResolvedEvent, UnitMovedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/content/TileMaps";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { UnitMenuRow } from "@/game/movement/view/UnitMenus";
import { PositionalChoiceComponent } from "@/game/positional/components/PositionalChoiceComponent";
import { PositionalComponent } from "@/game/positional/components/PositionalComponent";
import { POSITIONAL_ABILITIES, PositionalAbility } from "@/game/positional/content/PositionalAbilities";
import { PositionalFeature } from "@/game/positional/PositionalFeature";
import { PositionalState } from "@/game/positional/states/PositionalState";
import { PositionalChoiceSystem } from "@/game/positional/systems/PositionalChoiceSystem";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitById } from "@/game/units/rules/UnitLookup";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * The positional abilities end to end, on the spec scenario: Dardan carries all
 * six at 4,10, beside Elira at 5,10, with Teuta under her at 5,11 - two tiles
 * off him on the diagonal. A row shows only while somebody is in reach,
 * choosing one points the cursor at who would be moved, and confirming slides
 * the pieces and spends the user.
 */
suite("Positional Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("positional-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let features: { install(): void; uninstall(): void }[] = [];
	let map: Entity;
	let cursor: Entity;

	const unsubscribes: (() => void)[] = [];

	/** Subscribes for the length of one test - afterEach lets go again. */
	const listen = <Name extends EventNames>(name: Name, handler: EventHandler<Name>) => unsubscribes.push(eventBus.subscribe(name, handler));

	const unit = (id: string) => unitById(unitsInWorld(world), id) as Entity;
	const sheet = (id: string) => unit(id).getComponent(UnitComponent).read();
	const tile = (id: string) => unit(id).getComponent(GridPositionComponent).read();
	const patch = (id: string, changes: Partial<UnitData>) => {
		const component = unit(id).getComponent(UnitComponent);
		component.update({ ...component.read(), ...changes } as UnitData);
	};

	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();
	const cursorTile = () => cursor.getComponent(GridPositionComponent).read();
	const choice = () => (stateManager.getState(PositionalState).getChoice() as Entity).getComponent(PositionalChoiceComponent);

	/** Gives Dardan Hasan's Strength (9 against his 6), so a push against either enemy wins the contest. */
	const overpower = () => patch("dardan", { stats: { ...sheet("dardan").stats, strength: sheet("hasan").stats.strength } });

	/** Puts a unit on a tile - to set up who is standing beside whom. */
	const placeUnit = (id: string, column: number, row: number) => unit(id).getComponent(GridPositionComponent).update({ column, row });

	/** Lets every walk land, the way UnitWalkSystem does once the tokens arrive. */
	const finishWalks = () => {
		const walkSystem = new UnitWalkSystem(8).initialize();
		walkSystem.execute(10_000);
		eventBus.processQueue(); // unit:moved
		walkSystem.dispose();
	};

	/** Picks a unit up and sets it back down where it stands, leaving its command menu open. */
	const openCommandMenu = (column: number, row: number) => {
		eventBus.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventBus.processQueue();
		eventBus.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventBus.processQueue();
		finishWalks();
	};

	/** Chooses an ability's row on the command menu, which opens the "who am I moving?" choice. */
	const chooseAbility = (ability: PositionalAbility) => {
		const index = menu()?.ids.indexOf(ability) ?? 0;
		eventBus.dispatch("ui:menuConfirmed", { menu: "unit-command", row: ability, index, item: menu()?.items[index] ?? "" });
		eventBus.processQueue();
		eventBus.processQueue(); // positional:requested
	};

	/** Runs PositionalChoiceSystem once, so a flagged confirm / cancel is resolved and its fallout settles. */
	const pumpChoice = () => {
		const system = new PositionalChoiceSystem(10).initialize();
		system.execute(16, 0);
		eventBus.processQueue(); // positional:confirmed / positional:cancelled
		eventBus.processQueue(); // positional:resolved / the menu comes back
		eventBus.processQueue(); // unit:acted
		system.dispose();
	};

	/** Points the choice at one of the units in reach, the way the cycling commands would. */
	const pointAt = (partnerIndex: number) => {
		choice().update({ ...choice().read(), partnerIndex });
		pumpChoice();
	};

	/** Settles on whoever the cursor is pointing at, which slides the pieces. */
	const confirmTarget = () => {
		choice().update({ ...choice().read(), confirmed: true });
		pumpChoice();
	};

	/** Backs out of the choice. */
	const cancelChoice = () => {
		choice().update({ ...choice().read(), cancelled: true });
		pumpChoice();
	};

	beforeEach(() => {
		stateManager.clear();

		map = world.createEntity();
		map.addComponent(GridComponent, GridComponent.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		const units = new UnitsFeature();
		const ui = new UIFeature({ demo: false });
		const movement = new MovementFeature({ dependencies: [units, ui] });
		const positional = new PositionalFeature({ dependencies: [units, movement] });

		features = [units, ui, movement, positional];

		for (const feature of features) {
			feature.install();
		}

		eventBus.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16, scenario: "spec" });
		eventBus.processQueue();
	});

	afterEach(() => {
		while (unsubscribes.length > 0) {
			(unsubscribes.pop() as () => void)();
		}

		for (const feature of [...features].reverse()) {
			feature.uninstall();
		}

		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventBus.processQueue();
	});

	test("map:ready marks the battle, and map:closed clears the mark", () => {
		expect(world.entityWith(PositionalComponent)).not.toBeNull();

		eventBus.dispatch("map:closed", {});
		eventBus.processQueue();

		expect(world.entityWith(PositionalComponent)).toBeNull();
	});

	test("The command menu offers the abilities on the sheet that have somebody in reach, after Trade", () => {
		// Dardan: Elira beside him serves every push, pull and swap, and Teuta on the diagonal a Mystic Pull.
		openCommandMenu(4, 10);

		expect(menu()?.items).toStrictEqual([
			i18n("menu.items"),
			i18n("menu.trade"),
			i18n("menu.swap"),
			i18n("menu.shove"),
			i18n("menu.reposition"),
			i18n("menu.knockback"),
			i18n("menu.drawBack"),
			i18n("menu.mysticPull"),
			i18n("menu.wait")
		]);
		expect(menu()?.ids).toStrictEqual([UnitMenuRow.ITEMS, UnitMenuRow.TRADE, ...POSITIONAL_ABILITIES, UnitMenuRow.WAIT]);
	});

	test("An ability with nobody legal in reach stays off the menu", () => {
		placeUnit("teuta", 7, 10); // on Elira's Knockback landing tile, and three tiles from Dardan - too far for a Mystic Pull
		openCommandMenu(4, 10);

		expect(menu()?.ids).toStrictEqual([UnitMenuRow.ITEMS, UnitMenuRow.TRADE, UnitMenuRow.SWAP, UnitMenuRow.SHOVE, UnitMenuRow.REPOSITION, UnitMenuRow.DRAW_BACK, UnitMenuRow.WAIT]);
	});

	test("A push takes an enemy beside the unit as readily as an ally - both are offered as targets", () => {
		placeUnit("hasan", 4, 11); // he also takes the tile Teuta would be pulled onto
		overpower();
		openCommandMenu(4, 10);

		expect(menu()?.ids).toStrictEqual([
			UnitMenuRow.ATTACK,
			UnitMenuRow.ITEMS,
			UnitMenuRow.TRADE,
			UnitMenuRow.SWAP,
			UnitMenuRow.SHOVE,
			UnitMenuRow.REPOSITION,
			UnitMenuRow.KNOCKBACK,
			UnitMenuRow.DRAW_BACK,
			UnitMenuRow.WAIT
		]);

		chooseAbility(PositionalAbility.KNOCKBACK);
		expect(choice().read().partnerIds).toStrictEqual(["elira", "hasan"]);
	});

	test("An enemy whose Strength is above the user's is not offered to a push - the ally beside him still is", () => {
		placeUnit("hasan", 4, 11); // Str 9 against Dardan's 6
		openCommandMenu(4, 10);

		// Shove and Knockback stay on the menu: Elira can still be pushed.
		expect(menu()?.ids).toContain(UnitMenuRow.SHOVE);
		expect(menu()?.ids).toContain(UnitMenuRow.KNOCKBACK);

		chooseAbility(PositionalAbility.SHOVE);
		expect(choice().read().partnerIds).toStrictEqual(["elira"]);
	});

	test("A unit with nothing on its sheet is offered nothing", () => {
		patch("dardan", { abilities: [] });
		openCommandMenu(4, 10);

		expect(menu()?.ids).toStrictEqual([UnitMenuRow.ITEMS, UnitMenuRow.TRADE, UnitMenuRow.WAIT]);
	});

	test("Choosing Swap points the cursor at the ally and lights both tiles, and confirming trades places and spends the unit", () => {
		let requested: PositionalRequestedEvent | null = null;
		let confirmed: PositionalConfirmedEvent | null = null;
		let resolved: PositionalResolvedEvent | null = null;
		let acted: string | null = null;
		listen("positional:requested", (event) => (requested = event));
		listen("positional:confirmed", (event) => (confirmed = event));
		listen("positional:resolved", (event) => (resolved = event));
		listen("unit:acted", (event) => (acted = event.unitId));

		openCommandMenu(4, 10);
		chooseAbility(PositionalAbility.SWAP);

		expect(requested).toMatchObject({ unitId: "dardan", ability: "swap" });
		expect(stateManager.peek()).toBeInstanceOf(PositionalState);
		expect(choice().read()).toMatchObject({ unitId: "dardan", ability: "swap", partnerIds: ["elira"], partnerId: "elira" });
		expect(PositionalChoiceComponent.destinations(choice().read())).toStrictEqual([
			{ column: 5, row: 10 },
			{ column: 4, row: 10 }
		]);

		// The cursor sits on whoever is about to be moved.
		pointAt(0);
		expect(cursorTile()).toMatchObject({ column: 5, row: 10 });

		confirmTarget();

		expect(confirmed).toMatchObject({ unitId: "dardan", ability: "swap", targetId: "elira" });
		expect(resolved).toMatchObject({
			unitId: "dardan",
			targetId: "elira",
			steps: [
				{ unitId: "dardan", fromColumn: 4, fromRow: 10, toColumn: 5, toRow: 10 },
				{ unitId: "elira", fromColumn: 5, fromRow: 10, toColumn: 4, toRow: 10 }
			]
		});

		// Both stand on their new tiles at once and slide there; the cursor is back on the user's old tile.
		expect(tile("dardan")).toMatchObject({ column: 5, row: 10 });
		expect(tile("elira")).toMatchObject({ column: 4, row: 10 });
		expect(unit("dardan").hasComponent(WalkComponent)).toBe(true);
		expect(unit("elira").hasComponent(WalkComponent)).toBe(true);
		expect(cursorTile()).toMatchObject({ column: 4, row: 10 });

		// Using the ability is Dardan's action for the turn.
		expect(acted).toBe("dardan");
		expect(sheet("dardan").hasMoved).toBe(true);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(false);
		expect(stateManager.peek()).not.toBeInstanceOf(PositionalState);
		expect(stateManager.peek()).not.toBeInstanceOf(MenuState);
	});

	test("The slides land the way a move does, and landing reopens no menu", () => {
		const moved: UnitMovedEvent[] = [];
		listen("unit:moved", (event) => moved.push(event));

		openCommandMenu(4, 10);
		moved.length = 0;
		chooseAbility(PositionalAbility.SWAP);
		confirmTarget();
		finishWalks();

		expect(moved.map((event) => event.unitId).sort()).toStrictEqual(["dardan", "elira"]);
		expect(unit("dardan").hasComponent(WalkComponent)).toBe(false);
		expect(unit("elira").hasComponent(WalkComponent)).toBe(false);
		expect(stateManager.peek()).not.toBeInstanceOf(MenuState);
	});

	test("Backing out of the choice moves nobody and puts the command menu back", () => {
		let cancelled: PositionalCancelledEvent | null = null;
		let acted: string | null = null;
		listen("positional:cancelled", (event) => (cancelled = event));
		listen("unit:acted", (event) => (acted = event.unitId));

		openCommandMenu(4, 10);
		chooseAbility(PositionalAbility.SWAP);
		cancelChoice();

		expect(cancelled).toMatchObject({ unitId: "dardan" });
		expect(acted).toBeNull();
		expect(tile("dardan")).toMatchObject({ column: 4, row: 10 });
		expect(tile("elira")).toMatchObject({ column: 5, row: 10 });
		expect(sheet("dardan").hasMoved).toBe(false);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(true);
		expect(cursorTile()).toMatchObject({ column: 4, row: 10 });
		expect(menu()?.id).toBe("unit-command");
	});

	test("With several in reach, the cursor picks between them - Dardan shoves Teuta rather than Elira", () => {
		let resolved: PositionalResolvedEvent | null = null;
		listen("positional:resolved", (event) => (resolved = event));

		placeUnit("teuta", 4, 11); // under him, so two allies stand beside him
		openCommandMenu(4, 10);
		chooseAbility(PositionalAbility.SHOVE);

		expect(choice().read().partnerIds).toStrictEqual(["elira", "teuta"]);
		pumpChoice();
		expect(cursorTile()).toMatchObject({ column: 5, row: 10 });
		expect(PositionalChoiceComponent.destinations(choice().read())).toStrictEqual([{ column: 6, row: 10 }]);

		pointAt(1);
		expect(choice().read().partnerId).toBe("teuta");
		expect(cursorTile()).toMatchObject({ column: 4, row: 11 });
		expect(PositionalChoiceComponent.destinations(choice().read())).toStrictEqual([{ column: 4, row: 12 }]);

		confirmTarget();

		expect(resolved).toMatchObject({ unitId: "dardan", ability: "shove", targetId: "teuta" });
		expect(tile("teuta")).toMatchObject({ column: 4, row: 12 });
		expect(tile("elira")).toMatchObject({ column: 5, row: 10 }); // not her
		expect(tile("dardan")).toMatchObject({ column: 4, row: 10 }); // a shove does not move the shover
		expect(sheet("dardan").hasMoved).toBe(true);
	});

	test("Reposition pulls the ally through to the far side of the user", () => {
		openCommandMenu(4, 10);
		chooseAbility(PositionalAbility.REPOSITION);
		confirmTarget(); // Elira, on his right - she lands on his left

		expect(tile("elira")).toMatchObject({ column: 3, row: 10 });
		expect(tile("dardan")).toMatchObject({ column: 4, row: 10 });
	});

	test("Knockback sends an adjacent enemy two tiles back, sliding through the first", () => {
		placeUnit("hasan", 4, 11);
		overpower(); // Hasan (Str 9) would otherwise stand his ground against Dardan (Str 6)
		openCommandMenu(4, 10);
		chooseAbility(PositionalAbility.KNOCKBACK);

		expect(choice().read().partnerIds).toStrictEqual(["elira", "hasan"]);
		pointAt(1);
		expect(cursorTile()).toMatchObject({ column: 4, row: 11 });
		confirmTarget();

		expect(tile("elira")).toMatchObject({ column: 5, row: 10 }); // not her
		expect(tile("hasan")).toMatchObject({ column: 4, row: 13 });
		expect(unit("hasan").getComponent(WalkComponent).read().path).toStrictEqual([
			{ column: 4, row: 11 },
			{ column: 4, row: 12 },
			{ column: 4, row: 13 }
		]);
		expect(sheet("hasan").hasMoved).toBe(false); // being shoved costs the enemy nothing
	});

	test("Draw Back steps the user away and brings the ally into its tile", () => {
		openCommandMenu(4, 10); // Dardan: Elira on his right, so he steps left
		chooseAbility(PositionalAbility.DRAW_BACK);

		expect(choice().read().partnerIds).toStrictEqual(["elira"]);
		expect(PositionalChoiceComponent.destinations(choice().read())).toStrictEqual([
			{ column: 3, row: 10 },
			{ column: 4, row: 10 }
		]);

		confirmTarget();

		expect(tile("dardan")).toMatchObject({ column: 3, row: 10 });
		expect(tile("elira")).toMatchObject({ column: 4, row: 10 });
		expect(sheet("dardan").hasMoved).toBe(true);
	});

	test("Mystic Pull brings the diagonal ally in beside the user", () => {
		openCommandMenu(4, 10); // Dardan: Teuta at 5,11 is two tiles off on the diagonal
		chooseAbility(PositionalAbility.MYSTIC_PULL);

		expect(choice().read().partnerIds).toStrictEqual(["teuta"]);
		confirmTarget();

		// Across first would be 5,10 - Elira's tile - so she comes down to 4,11 instead.
		expect(tile("teuta")).toMatchObject({ column: 4, row: 11 });
	});

	test("A request for an ability with nobody in reach is cancelled straight back", () => {
		let cancelled: PositionalCancelledEvent | null = null;
		listen("positional:cancelled", (event) => (cancelled = event));

		placeUnit("teuta", 7, 10); // on Elira's landing tile, and not beside Dardan herself
		openCommandMenu(4, 10);
		eventBus.dispatch("positional:requested", { unitId: "dardan", ability: PositionalAbility.KNOCKBACK });
		eventBus.processQueue();
		eventBus.processQueue();

		expect(cancelled).toMatchObject({ unitId: "dardan" });
		expect(stateManager.peek()).not.toBeInstanceOf(PositionalState);
		expect(menu()?.id).toBe("unit-command");
	});
});
