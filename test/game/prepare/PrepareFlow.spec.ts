import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { getI18n, i18n } from "@/core/i18n/I18n";
import { InputDevice } from "@/core/input/InputDevice";
import { seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { PrepareBenchedEvent, PrepareDeployedEvent, PrepareMovedEvent, PrepareStoredEvent, PrepareTakenEvent, PrepareTradedEvent, TurnChangedEvent } from "@/game.events";
import { CampaignFeature } from "@/game/campaign/CampaignFeature";
import { CAMPAIGN_SLOT, CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ConvoyFeature } from "@/game/convoy/ConvoyFeature";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { MapFeature } from "@/game/map/MapFeature";
import { activeCursor } from "@/game/map/rules/ActiveMap";
import { MapState } from "@/game/map/states/MapState";
import { ExchangeComponent, ExchangeSide, NOTHING_HELD } from "@/game/prepare/components/ExchangeComponent";
import { PrepareComponent, PrepareMode } from "@/game/prepare/components/PrepareComponent";
import { PrepareFeature } from "@/game/prepare/PrepareFeature";
import { PrepareExchangeState } from "@/game/prepare/states/PrepareExchangeState";
import { PrepareState } from "@/game/prepare/states/PrepareState";
import { PrepareExchangeSystem } from "@/game/prepare/systems/PrepareExchangeSystem";
import { PrepareSystem } from "@/game/prepare/systems/PrepareSystem";
import { ARMY_MENU, EQUIP_MENU, PACK_MENU, PackAction, PREPARE_MENU, PrepareRow, USE_MENU } from "@/game/prepare/view/PrepareMenus";
import { RosterComponent } from "@/game/roster/components/RosterComponent";
import { RosterFeature } from "@/game/roster/RosterFeature";
import { RosterState } from "@/game/roster/states/RosterState";
import { RosterSystem } from "@/game/roster/systems/RosterSystem";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { PopupState } from "@/game/ui/states/PopupState";
import { MenuSystem } from "@/game/ui/systems/MenuSystem";
import { PopupSystem } from "@/game/ui/systems/PopupSystem";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import maksimoDocument from "@/assets/data/units/maksimo-auditore.unit.json";

/**
 * The preparations screen end to end, on the real map with a run on: it goes
 * up over a fresh battle and holds the opening turn; the pick list benches and
 * deploys; formation moves and swaps units between deploy tiles; a pack can be
 * readied, used from, and traded with the convoy or another pack; and "Begin"
 * lets the first phase open.
 */
suite("Prepare Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);

	/** Registered for the campaign flow, which is installed but never asked to read or write here. */
	ServiceRegistry.register("LocalDatabase", { getRepository: () => ({ read: () => Promise.resolve(undefined), save: () => Promise.resolve(1) }) });

	world.registerComponent(TransformComponent);
	getI18n();

	new Display("prepare-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	let features: { install(): void; uninstall(): void }[] = [];
	let stop: (() => void)[] = [];
	let turns: TurnChangedEvent[] = [];
	let benched: PrepareBenchedEvent[] = [];
	let deployedEvents: PrepareDeployedEvent[] = [];
	let moved: PrepareMovedEvent[] = [];
	let traded: PrepareTradedEvent[] = [];
	let stored: PrepareStoredEvent[] = [];
	let taken: PrepareTakenEvent[] = [];
	let opened = 0;
	let finished = 0;

	const unit = (id: string) => unitById(unitsInWorld(world), id);
	const tileOf = (id: string) => (unit(id) as Entity).getComponent(GridPositionComponent).read();
	const sheet = (id: string) => (unit(id) as Entity).getComponent(UnitComponent);
	const pack = (id: string) =>
		sheet(id)
			.read()
			.inventory.map((entry) => entry.id);
	const record = () => (world.entityWith(PrepareComponent) as Entity).getComponent(PrepareComponent).read();
	const campaign = () => (world.entityWith(CampaignComponent) as Entity).getComponent(CampaignComponent).read();
	const convoy = () => (world.entityWith(ConvoyComponent) as Entity).getComponent(ConvoyComponent);
	const convoyIds = () =>
		convoy()
			.read()
			.items.map((entry) => entry.id);
	const types = () => stateManager.getCurrentStates().map((state) => (state.constructor as typeof GameState).type);
	const menu = () => (stateManager.peek() as MenuState).getActiveMenu()?.getComponent(MenuComponent);
	const exchange = () => ((stateManager.peek() as PrepareExchangeState).getExchange() as Entity).getComponent(ExchangeComponent);
	const roster = () => ((stateManager.peek() as RosterState).getRoster() as Entity).getComponent(RosterComponent);

	const run = <T extends { execute(elapsed: number, frame: number): void; dispose(): void }>(system: T, elapsed: number) => {
		system.execute(elapsed, 0);
		system.dispose();
	};

	/** One frame as the game runs one: the queue drained once, then the prepare clock ahead of the menus. */
	const frame = (elapsed = 16) => {
		eventBus.processQueue();
		run(new PrepareSystem(9).initialize(), elapsed);
		run(new MenuSystem(10).initialize(), elapsed);
		run(new PrepareExchangeSystem(10).initialize(), elapsed);
		run(new RosterSystem(10).initialize(), elapsed);
	};

	/** Confirms a row of the open menu the way the player does: marked on the menu, taken by MenuSystem. */
	const choose = (row: string) => {
		const component = menu() as MenuComponent;
		const data = component.read();
		const index = data.ids.indexOf(row);
		expect(index, `row "${row}" of menu "${data.id}"`).toBeGreaterThanOrEqual(0);
		component.update({ ...data, selectedIndex: index, confirmedIndex: index });
		frame(); // MenuSystem reports the row
		frame(); // ui:menuConfirmed - the flow answers
		frame(); // what the flow dispatched lands
	};

	/** Confirms a row of the deploy list the way the player does: the highlight moved there, confirm marked, taken by RosterSystem. */
	const chooseRow = (unitId: string) => {
		const component = roster();
		const data = component.read();
		const index = data.unitIds.indexOf(unitId);
		expect(index, `row "${unitId}" of the deploy list`).toBeGreaterThanOrEqual(0);
		component.update({ ...data, selectedIndex: index, confirmed: true });
		frame(); // RosterSystem reports the row
		frame(); // roster:confirmed - the flow answers
		frame(); // what the flow dispatched lands
	};

	const closeRoster = () => {
		roster().update({ ...roster().read(), closed: true });
		frame();
		frame();
	};

	const cancelMenu = () => {
		const component = menu() as MenuComponent;
		component.update({ ...component.read(), cancelled: true });
		frame();
		frame();
	};

	/** Puts the packs' cursor on a row of one side, and presses confirm / cancel on the packs. */
	const moveTo = (side: ExchangeSide, slot: number) => exchange().update(ExchangeComponent.withCursorSlot({ ...exchange().read(), side }, slot));

	const pressExchange = (what: "confirmed" | "cancelled") => {
		exchange().update({ ...exchange().read(), [what]: true });
		frame(); // the exchange system resolves the press
		frame(); // what it dispatched lands
		frame();
	};

	/** Puts the cursor on a tile and presses confirm / cancel on the map. */
	const cursorTo = (column: number, row: number) => activeCursor(world)?.getComponent(GridPositionComponent).update({ column, row });

	const press = (what: "confirmed" | "cancelled") => {
		const entity = world.entityWith(PrepareComponent) as Entity;
		const component = entity.getComponent(PrepareComponent);
		component.update({ ...component.read(), [what]: true });
		frame(); // PrepareSystem reports the press with the cursor's tile
		frame(); // prepare:confirmed / cancelled - the flow answers
		frame(); // what the flow dispatched lands
	};

	/** A run on chapter 1, with Maksimo already on the roster from before, and the battle set up under the screen. */
	const open = (bench: string[] = ["maksimo-auditore"]) => {
		const run = world.createEntity();
		run.addComponent(CampaignComponent, {
			...CampaignComponent.begin(CAMPAIGN_SLOT, "chapter-one"),
			roster: bench.map((id) => buildUnit({ ...maksimoDocument, id } as UnitDocument))
		});

		stateManager.getState(MapState).request({ scenario: "chapter-one", map: "map-spec" });
		stateManager.switch(MapState); // queues map:ready
		frame(); // map:ready - the battle is set up, the run laid over it, the screen goes up
		frame(); // turn:changed - held
	};

	beforeEach(() => {
		seedRandom(1);
		stateManager.clear();

		const map = new MapFeature();
		const ui = new UIFeature({ demo: false });
		const units = new UnitsFeature();
		const turn = new TurnFeature({ dependencies: [units] });
		const convoyFeature = new ConvoyFeature({ dependencies: [units, ui] });
		const campaignFeature = new CampaignFeature({ dependencies: [ui, units, convoyFeature] });
		const rosterFeature = new RosterFeature({ dependencies: [units] });
		const feature = new PrepareFeature({ dependencies: [ui, units, convoyFeature, turn, campaignFeature, rosterFeature] });

		features = [map, ui, units, turn, convoyFeature, campaignFeature, rosterFeature, feature];

		for (const installed of features) {
			installed.install();
		}

		turns = [];
		benched = [];
		deployedEvents = [];
		moved = [];
		traded = [];
		stored = [];
		taken = [];
		opened = 0;
		finished = 0;
		stop = [
			eventBus.subscribe("turn:changed", (event) => turns.push(event), -5),
			eventBus.subscribe("prepare:benched", (event) => benched.push(event)),
			eventBus.subscribe("prepare:deployed", (event) => deployedEvents.push(event)),
			eventBus.subscribe("prepare:moved", (event) => moved.push(event)),
			eventBus.subscribe("prepare:traded", (event) => traded.push(event)),
			eventBus.subscribe("prepare:stored", (event) => stored.push(event)),
			eventBus.subscribe("prepare:taken", (event) => taken.push(event)),
			eventBus.subscribe("prepare:opened", () => opened++),
			eventBus.subscribe("prepare:finished", () => finished++)
		];
	});

	afterEach(() => {
		for (const unsubscribe of stop) {
			unsubscribe();
		}

		stateManager.clear();

		for (const feature of [...features].reverse()) {
			feature.uninstall();
		}

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventBus.processQueue();
	});

	test("With a run on, the screen goes up over the fresh battle and holds the opening turn", () => {
		open();

		expect(opened).toBe(1);
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
		expect(menu()?.read()).toMatchObject({ id: PREPARE_MENU, ids: [PrepareRow.UNITS, PrepareRow.FORMATION, PrepareRow.ITEMS, PrepareRow.BEGIN] });
		expect(record()).toMatchObject({ mode: PrepareMode.MENU, capacity: 4, required: ["dardan-niveli", "hasan-eyletmez"], holding: true, turnNumber: 1, turnPhase: "player" });
		expect(record().slots).toHaveLength(4);

		// The turn exists, but nobody heard it open: no banner.
		expect(world.entityWith(TurnComponent)).not.toBeNull();
		expect(turns).toStrictEqual([]);
		expect(stateManager.getCurrentStates().some((state) => state instanceof PhaseBannerState)).toBe(false);
	});

	test("A battle whose army is fixed opens straight into its first phase", () => {
		const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);
		const bellum = assets.getJson<object>("deployment-chapter-one");

		assets.setJson("deployment-chapter-one", { ...bellum, preparations: false });
		open();
		assets.setJson("deployment-chapter-one", bellum);

		expect(opened).toBe(0);
		expect(types()).not.toContain(PrepareState.type);
		expect(turns).toHaveLength(1);
	});

	test("Without a run the map opens the way it always has", () => {
		stateManager.switch(MapState);
		frame();
		frame();

		expect(opened).toBe(0);
		expect(world.entityWith(PrepareComponent)).toBeNull();
		expect(turns).toHaveLength(1);
		expect(stateManager.peek()).toBeInstanceOf(PhaseBannerState);
	});

	test("Begin takes the screen down and lets the first phase open", () => {
		open();
		choose(PrepareRow.BEGIN);

		expect(finished).toBe(1);
		expect(record().mode).toBe(PrepareMode.DONE);
		// The held turn went on, and the banner went up on it.
		expect(turns).toStrictEqual([expect.objectContaining({ number: 1, phase: "player" })]);
		expect(types()).toStrictEqual([MapState.type, PhaseBannerState.type]);
	});

	test("Backing out of the preparations menu puts it straight back up", () => {
		open();
		cancelMenu();

		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
		expect(menu()?.read().id).toBe(PREPARE_MENU);
	});

	test("Units opens the army's stat table as a deploy list: it deploys a benched unit on a free tile and benches it again, keeping the required on the map", () => {
		open();
		choose(PrepareRow.UNITS);

		expect(types()).toStrictEqual([MapState.type, PrepareState.type, RosterState.type]);
		expect(record().mode).toBe(PrepareMode.UNITS);
		expect(roster().read()).toMatchObject({
			unitIds: ["dardan-niveli", "hasan-eyletmez", "maksimo-auditore"],
			status: [i18n("prepare.required"), i18n("prepare.required"), i18n("prepare.bench")],
			disabled: [true, true, false],
			selectable: true
		});
		expect(roster().read().title).toContain("2/4");
		// The benched unit is not on the map: the list carries his sheet to draw him from.
		expect(
			roster()
				.read()
				.sheets.map((entry) => entry.id)
		).toStrictEqual(["maksimo-auditore"]);

		chooseRow("maksimo-auditore");
		expect(tileOf("maksimo-auditore")).toStrictEqual({ column: 5, row: 11 }); // the first free deploy tile
		expect(deployedEvents).toStrictEqual([expect.objectContaining({ unitId: "maksimo-auditore", column: 5, row: 11 })]);
		expect(roster().read().title).toContain("3/4");
		expect(roster().read()).toMatchObject({ selectedIndex: 2, sheets: [], status: [i18n("prepare.required"), i18n("prepare.required"), i18n("prepare.onMap")] });

		// Level him up on the map: benching carries the change onto the roster.
		sheet("maksimo-auditore").update({ ...sheet("maksimo-auditore").read(), level: 3 });
		chooseRow("maksimo-auditore");
		expect(unit("maksimo-auditore")).toBeNull();
		expect(benched).toStrictEqual([expect.objectContaining({ unitId: "maksimo-auditore" })]);
		expect(CampaignComponent.veteran(campaign(), "maksimo-auditore")?.level).toBe(3);
		expect(roster().read().title).toContain("2/4");

		// A required unit stays where it is.
		chooseRow("dardan-niveli");
		expect(unit("dardan-niveli")).not.toBeNull();

		closeRoster();
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
		expect(menu()?.read()).toMatchObject({ id: PREPARE_MENU, selectedIndex: 0 });
		expect(record().mode).toBe(PrepareMode.MENU);
	});

	test("Nobody is deployed past the capacity", () => {
		open(["maksimo-auditore", "leona-kaori", "lina-yukari"]);
		const entity = world.entityWith(PrepareComponent) as Entity;
		entity.getComponent(PrepareComponent).update({ ...record(), capacity: 3 });

		choose(PrepareRow.UNITS);
		chooseRow("maksimo-auditore");
		expect(unit("maksimo-auditore")).not.toBeNull();

		chooseRow("leona-kaori");
		expect(unit("leona-kaori")).toBeNull();
		expect(roster().read().title).toContain("3/3");
	});

	test("Formation picks a unit up and puts it on a free deploy tile, or swaps it with whoever stands there", () => {
		open();
		choose(PrepareRow.FORMATION);
		expect(types()).toStrictEqual([MapState.type, PrepareState.type]);
		expect(record().mode).toBe(PrepareMode.FORMATION);

		cursorTo(5, 10); // Hasan
		press("confirmed");
		expect(record().picked).toBe("hasan-eyletmez");

		cursorTo(9, 9); // not a deploy tile - nothing happens, he stays picked up
		press("confirmed");
		expect(record().picked).toBe("hasan-eyletmez");
		expect(tileOf("hasan-eyletmez")).toStrictEqual({ column: 5, row: 10 });

		cursorTo(3, 11); // a free deploy tile
		press("confirmed");
		expect(tileOf("hasan-eyletmez")).toStrictEqual({ column: 3, row: 11 });
		expect(moved).toStrictEqual([expect.objectContaining({ unitId: "hasan-eyletmez", column: 3, row: 11 })]);
		expect(record().picked).toBe("");

		cursorTo(4, 10); // Dardan, onto Hasan's tile: they swap
		press("confirmed");
		cursorTo(3, 11);
		press("confirmed");
		expect(tileOf("dardan-niveli")).toStrictEqual({ column: 3, row: 11 });
		expect(tileOf("hasan-eyletmez")).toStrictEqual({ column: 4, row: 10 });

		// Cancel with someone picked up puts them down; cancel with nobody returns to the menu.
		cursorTo(3, 11);
		press("confirmed");
		expect(record().picked).toBe("dardan-niveli");
		press("cancelled");
		expect(record().picked).toBe("");
		press("cancelled");
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
		expect(menu()?.read()).toMatchObject({ id: PREPARE_MENU, selectedIndex: 1 });
	});

	test("Items puts the army list up - everyone, the benched marked - and a unit's pack menu beside its pack", () => {
		open();
		choose(PrepareRow.ITEMS);
		expect(record().mode).toBe(PrepareMode.ITEMS);
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
		expect(menu()?.read()).toMatchObject({ id: ARMY_MENU, ids: ["dardan-niveli", "hasan-eyletmez", "maksimo-auditore"], values: ["", "", i18n("prepare.bench")], title: i18n("prepare.items") });
		expect(menu()?.read().columns).toBeGreaterThan(1);

		choose("dardan-niveli");
		expect(record().picked).toBe("dardan-niveli");
		expect(menu()?.read()).toMatchObject({ id: PACK_MENU, ids: [PackAction.CONVOY, PackAction.TRADE, PackAction.EQUIP, PackAction.USE] });
		expect((stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read().id).toBe(ARMY_MENU);

		// Out of the pack menu: the list is hovering again; out of the list: the menu.
		cancelMenu();
		expect(menu()?.read()).toMatchObject({ id: ARMY_MENU, selectedIndex: 0 });
		expect(record().picked).toBe("");
		cancelMenu();
		expect(menu()?.read()).toMatchObject({ id: PREPARE_MENU, selectedIndex: 2 });
	});

	test("Equip readies a weapon off the pack and Use spends an item on the unit, the pack menu coming back each time", () => {
		open();
		sheet("dardan-niveli").update(UnitComponent.give(sheet("dardan-niveli").read(), "energy-drop"));
		choose(PrepareRow.ITEMS);
		choose("hasan-eyletmez");

		// Hasan carries an axe and a sword: the sword is readied in the axe's place.
		choose(PackAction.EQUIP);
		expect(menu()?.read()).toMatchObject({ id: EQUIP_MENU, ids: ["bronze-axe", "bronze-sword", "vulnerary"], disabled: [false, false, true] });
		choose("bronze-sword");
		expect(sheet("hasan-eyletmez").read().weapon?.id).toBe("bronze-sword");
		expect(pack("hasan-eyletmez")).toStrictEqual(["bronze-sword", "bronze-axe", "vulnerary"]);
		expect(menu()?.read()).toMatchObject({ id: PACK_MENU, selectedIndex: 2 });

		// A rested unit has nothing to heal; a booster is the one thing Dardan can use.
		cancelMenu();
		choose("dardan-niveli");
		choose(PackAction.USE);
		expect(menu()?.read()).toMatchObject({ id: USE_MENU, ids: ["bronze-sword", "vulnerary", "energy-drop"], disabled: [true, true, false] });

		const strength = sheet("dardan-niveli").read().stats.strength;
		choose("energy-drop");
		expect(sheet("dardan-niveli").read().stats.strength).toBe(strength + 2);
		expect(pack("dardan-niveli")).toStrictEqual(["bronze-sword", "vulnerary"]);

		// The gains are listed over the pack menu; acknowledging them leaves the menu on "Use".
		expect(stateManager.peek()).toBeInstanceOf(PopupState);
		const popup = stateManager.getState(PopupState).getPopup()?.getComponent(PopupComponent) as PopupComponent;
		popup.update({ ...popup.read(), closed: true });
		run(new PopupSystem(10).initialize(), 16);
		frame();
		expect(menu()?.read()).toMatchObject({ id: PACK_MENU, selectedIndex: 3, disabled: [false, false, false, true] });
	});

	test("Convoy opens the convoy beside the pack, and things go both ways between them", () => {
		open();
		choose(PrepareRow.ITEMS);
		choose("dardan-niveli");
		choose(PackAction.CONVOY);

		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type, PrepareExchangeState.type]);
		expect(exchange().read()).toMatchObject({ unitId: "dardan-niveli", partnerId: "", side: ExchangeSide.PACK, heldSide: NOTHING_HELD });
		// The list is still up above the packs, on the unit whose pack is open.
		expect((stateManager.getCurrentStates().at(-2) as MenuState).getMenu()?.getComponent(MenuComponent).read()).toMatchObject({ id: ARMY_MENU, selectedIndex: 0, title: i18n("prepare.items") });

		// The vulnerary, picked up off the pack and put down on the convoy's empty row.
		moveTo(ExchangeSide.PACK, 1);
		pressExchange("confirmed");
		expect(exchange().read()).toMatchObject({ heldSide: ExchangeSide.PACK, heldSlot: 1 });
		moveTo(ExchangeSide.OTHER, 0);
		pressExchange("confirmed");
		expect(pack("dardan-niveli")).toStrictEqual(["bronze-sword"]);
		expect(convoyIds()).toStrictEqual(["vulnerary"]);
		expect(stored).toStrictEqual([expect.objectContaining({ unitId: "dardan-niveli", itemId: "vulnerary" })]);
		expect(exchange().read()).toMatchObject({ heldSide: NOTHING_HELD });

		// An empty row never picks up; a convoy entry put on an empty slot comes into the pack.
		moveTo(ExchangeSide.OTHER, 1);
		pressExchange("confirmed");
		expect(exchange().read().heldSide).toBe(NOTHING_HELD);
		moveTo(ExchangeSide.OTHER, 0);
		pressExchange("confirmed");
		moveTo(ExchangeSide.PACK, 5);
		pressExchange("confirmed");
		expect(pack("dardan-niveli")).toStrictEqual(["bronze-sword", "vulnerary"]);
		expect(convoyIds()).toStrictEqual([]);
		expect(taken).toStrictEqual([expect.objectContaining({ unitId: "dardan-niveli", itemId: "vulnerary" })]);
		// The convoy shrank under the cursor: it is kept on a row that exists.
		expect(exchange().read().otherSlot).toBe(0);

		// The sword, swapped for a convoy entry: Dardan is left unarmed, the sword unreadied in the train.
		convoy().store(sheet("hasan-eyletmez").read().inventory[0]);
		moveTo(ExchangeSide.PACK, 0);
		pressExchange("confirmed");
		moveTo(ExchangeSide.OTHER, 0);
		pressExchange("confirmed");
		expect(pack("dardan-niveli")).toStrictEqual(["bronze-axe", "vulnerary"]);
		expect(sheet("dardan-niveli").read().weapon).toBeNull();
		expect(convoy().read().items[0]).toMatchObject({ id: "bronze-sword", equipped: false });

		// Backing out with nothing in hand closes the packs; the list is hovering again.
		pressExchange("cancelled");
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
		expect(menu()?.read()).toMatchObject({ id: ARMY_MENU, selectedIndex: 0 });
		expect(record().picked).toBe("");
	});

	test("Trade sends the list looking for a partner, whose pack then opens beside the unit's - on the map or on the bench", () => {
		open();
		choose(PrepareRow.ITEMS);
		choose("dardan-niveli");
		choose(PackAction.TRADE);

		// Back on the list, on the first other unit, asking whom to trade with.
		expect(record()).toMatchObject({ picked: "dardan-niveli", trading: true });
		expect(menu()?.read()).toMatchObject({ id: ARMY_MENU, selectedIndex: 1, title: i18n("prepare.partner") });

		// Backing out of that returns to the pack menu on "Trade".
		cancelMenu();
		expect(menu()?.read()).toMatchObject({ id: PACK_MENU, selectedIndex: 1 });
		expect(record()).toMatchObject({ picked: "dardan-niveli", trading: false });

		// The vulnerary goes to Hasan, on the map, onto an empty slot of his.
		choose(PackAction.TRADE);
		choose("hasan-eyletmez");
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type, PrepareExchangeState.type]);
		expect(exchange().read()).toMatchObject({ unitId: "dardan-niveli", partnerId: "hasan-eyletmez" });
		expect(record().trading).toBe(false);

		moveTo(ExchangeSide.PACK, 1);
		pressExchange("confirmed");
		moveTo(ExchangeSide.OTHER, 7);
		pressExchange("confirmed");
		expect(pack("dardan-niveli")).toStrictEqual(["bronze-sword"]);
		expect(pack("hasan-eyletmez")).toStrictEqual(["bronze-axe", "bronze-sword", "vulnerary", "vulnerary"]);
		expect(traded).toStrictEqual([expect.objectContaining({ unitId: "dardan-niveli", partnerId: "hasan-eyletmez", itemId: "vulnerary" })]);

		// Two entries swap places; both events say who gave what.
		moveTo(ExchangeSide.OTHER, 0);
		pressExchange("confirmed");
		moveTo(ExchangeSide.PACK, 0);
		pressExchange("confirmed");
		expect(pack("dardan-niveli")).toStrictEqual(["bronze-axe"]);
		expect(pack("hasan-eyletmez")).toStrictEqual(["bronze-sword", "bronze-sword", "vulnerary", "vulnerary"]);
		expect(traded).toHaveLength(3);
		pressExchange("cancelled");

		// The axe goes to Maksimo, on the bench: the roster entry has it, unreadied.
		choose("dardan-niveli");
		choose(PackAction.TRADE);
		choose("maksimo-auditore");
		moveTo(ExchangeSide.PACK, 0);
		pressExchange("confirmed");
		moveTo(ExchangeSide.OTHER, 2);
		pressExchange("confirmed");
		expect(pack("dardan-niveli")).toStrictEqual([]);
		expect(CampaignComponent.veteran(campaign(), "maksimo-auditore")?.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-bow", "vulnerary", "bronze-axe"]);
		expect(CampaignComponent.veteran(campaign(), "maksimo-auditore")?.inventory.at(-1)).toMatchObject({ equipped: false, equippable: true });
		pressExchange("cancelled");

		// A benched unit's pack can be opened and worked on too.
		choose("maksimo-auditore");
		choose(PackAction.EQUIP);
		expect(menu()?.read()).toMatchObject({ id: EQUIP_MENU, ids: ["bronze-bow", "vulnerary", "bronze-axe"] });
		choose("bronze-axe");
		expect(CampaignComponent.veteran(campaign(), "maksimo-auditore")?.weapon?.id).toBe("bronze-axe");

		// The picked unit itself is no partner: confirming it on the list does nothing.
		choose(PackAction.TRADE);
		choose("maksimo-auditore");
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
		expect(menu()?.read()).toMatchObject({ id: ARMY_MENU, title: i18n("prepare.partner") });
	});

	test("The screen goes with the map", () => {
		open();
		stateManager.switch(MapState); // the battle over, another set up - the run is still on
		frame();
		frame();

		expect(opened).toBe(2);
		expect(world.getEntities().filter((entity) => entity.hasComponent(PrepareComponent))).toHaveLength(1);
		expect(types()).toStrictEqual([MapState.type, PrepareState.type, MenuState.type]);
	});
});
