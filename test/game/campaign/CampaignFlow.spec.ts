import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { getI18n } from "@/core/i18n/I18n";
import { InputDevice } from "@/core/input/InputDevice";
import { getRandomState, seedRandom } from "@/core/math/generation/Randomizer";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { CampaignChapterClearedEvent, CampaignChapterStartedEvent, CampaignSavedEvent, CampaignSlotChosenEvent, CampaignSlotReadEvent, MapReadyEvent } from "@/game.events";
import { AIFeature } from "@/game/ai/AIFeature";
import { CampaignFeature } from "@/game/campaign/CampaignFeature";
import { Savegame } from "@/core/model/Savegame";
import { CAMPAIGN_SLOT, CampaignComponent, CampaignData, SAVE_SLOTS } from "@/game/campaign/components/CampaignComponent";
import { ChapterCardComponent } from "@/game/campaign/components/ChapterCardComponent";
import { SaveSlotComponent, SlotPurpose } from "@/game/campaign/components/SaveSlotComponent";
import { TitleComponent } from "@/game/campaign/components/TitleComponent";
import { ChapterCardState } from "@/game/campaign/states/ChapterCardState";
import { SaveSlotState } from "@/game/campaign/states/SaveSlotState";
import { TitleState } from "@/game/campaign/states/TitleState";
import { CampaignSystem } from "@/game/campaign/systems/CampaignSystem";
import { TITLE_MENU_ID, TitleRow } from "@/game/campaign/view/TitleScreen";
import { CombatFeature } from "@/game/combat/CombatFeature";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ConvoyFeature } from "@/game/convoy/ConvoyFeature";
import { MapFeature } from "@/game/map/MapFeature";
import { MapState } from "@/game/map/states/MapState";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { ObjectiveComponent } from "@/game/objective/components/ObjectiveComponent";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
import { ObjectiveFeature } from "@/game/objective/ObjectiveFeature";
import { OutcomeState } from "@/game/objective/states/OutcomeState";
import { ObjectiveSystem } from "@/game/objective/systems/ObjectiveSystem";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { TurnFeature } from "@/game/turn/TurnFeature";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { MenuSystem } from "@/game/ui/systems/MenuSystem";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { deploymentAsset, DeploymentDocument } from "@/game/units/content/Deployments";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import dardanDocument from "@/assets/data/units/dardan-niveli.unit.json";

/**
 * The run end to end, on the real map state: the title asks the store and
 * offers what it found, a run begins or continues into a chapter card, the
 * card enters the chapter's battle, a won battle carries the survivors and
 * the convoy into the next chapter's card and the slot, a lost one starts the
 * chapter over from the same record, and the last chapter won returns to the
 * title.
 */
suite("Campaign Flow Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventBus = ServiceRegistry.get<EventBus>(EventBus.name);
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	/**
	 * Stands in for the database: the one store the campaign writes, in memory,
	 * answering a tick later the way IndexedDB does. Registered under the class
	 * name the flow injects by; nothing else in a spec builds a LocalDatabase.
	 */
	const slots = new Map<number, Savegame>();
	const repository = {
		read: (key: number) => Promise.resolve(slots.get(key)),
		list: () => Promise.resolve([...slots.values()]),
		save: (data: Savegame) => {
			slots.set(data.id, structuredClone(data));
			return Promise.resolve(data.id);
		}
	};

	/** A run as a slot would hold it: laid into an empty snapshot, written on a fixed date. */
	const stash = (run: CampaignData, modifiedOn = "2026-09-19T00:00:00.000Z", randomState = 7) =>
		slots.set(run.slot, CampaignComponent.toSave(run, { id: run.slot, playtime: run.playtime, modifiedOn, screenshot: "", currentState: [], entities: [] }, randomState));
	ServiceRegistry.register("LocalDatabase", { getRepository: () => repository });

	world.registerComponent(TransformComponent);
	getI18n();

	new Display("campaign-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const bellum = assets.getJson<DeploymentDocument>(deploymentAsset("bellum"));
	const river = assets.getJson<DeploymentDocument>(deploymentAsset("river"));

	let features: { install(): void; uninstall(): void }[] = [];
	let objectiveSystem: ObjectiveSystem | null = null;
	let stop: (() => void)[] = [];
	let ready: MapReadyEvent[] = [];
	let started: CampaignChapterStartedEvent[] = [];
	let cleared: CampaignChapterClearedEvent[] = [];
	let saved: CampaignSavedEvent[] = [];
	let slotRead: CampaignSlotReadEvent[] = [];
	let slotChosen: CampaignSlotChosenEvent[] = [];
	let finished = 0;

	const unit = (id: string) => unitById(unitsInWorld(world), id);
	const sheet = (id: string) => (unit(id) as Entity).getComponent(UnitComponent);
	const campaign = () => (world.entityWith(CampaignComponent) as Entity).getComponent(CampaignComponent).read();
	const convoy = () => (world.entityWith(ConvoyComponent) as Entity).getComponent(ConvoyComponent);
	const card = () => stateManager.getState(ChapterCardState).getCard()?.getComponent(ChapterCardComponent);
	const banner = () => stateManager.getState(OutcomeState).getBanner()?.getComponent(OutcomeComponent);
	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent);
	const slotList = () => (stateManager.peek() as SaveSlotState).getSlots()?.getComponent(SaveSlotComponent);
	const topType = () => (stateManager.peek()?.constructor as typeof GameState).type;

	const run = <T extends { execute(elapsed: number, frame: number): void; dispose(): void }>(system: T, elapsed: number) => {
		system.execute(elapsed, 0);
		system.dispose();
	};

	/** One frame as the game runs one: the queue drained once, then the clocks in schedule order. */
	const frame = (elapsed = 16) => {
		eventBus.processQueue();
		objectiveSystem?.execute(elapsed, 0);
		run(new CampaignSystem(10).initialize(), elapsed);
		run(new MenuSystem(10).initialize(), elapsed);
	};

	/** Lets the store answer - a promise resolves between two frames. */
	const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

	const dismissBanner = () => {
		if (stateManager.peek() instanceof PhaseBannerState) {
			stateManager.pop();
		}
	};

	/** The title screen up, its slot read and its menu offered. */
	const openTitle = async () => {
		stateManager.switch(TitleState); // queues title:opened
		frame(); // title:opened - the store is asked
		await tick();
		frame(); // campaign:slotRead - the menu goes up
	};

	/** Confirms a row of the title menu the way the player does: marked on the menu, taken by MenuSystem; the slot list comes up. */
	const chooseRow = (row: TitleRow) => {
		const component = menu() as MenuComponent;
		const data = component.read();
		component.update({ ...data, confirmedIndex: data.ids.indexOf(row) });
		frame(); // MenuSystem reports the row and pops the menu
		frame(); // ui:menuConfirmed - the slot list goes up
	};

	/** Confirms a slot of the list the way the player does: the highlight moved there, confirm marked, taken by CampaignSystem. */
	const pickSlot = (slot: number) => {
		const component = slotList() as SaveSlotComponent;
		component.update({ ...component.read(), selectedIndex: slot - 1, confirmed: true });
		frame(); // CampaignSystem reports the slot
		frame(); // campaign:slotChosen - the run begins or continues, the card goes up
		frame(); // campaign:chapterStarted lands
	};

	/** A title row through to its chosen slot - the first by default. */
	const choose = (row: TitleRow, slot = CAMPAIGN_SLOT) => {
		chooseRow(row);
		pickSlot(slot);
	};

	/** Presses the chapter card away and lets the battle set up under its banner. */
	const enterBattle = () => {
		const component = card() as ChapterCardComponent;
		component.update({ ...component.read(), acknowledged: true });
		frame(); // the map is entered
		frame(); // map:ready - the battle is set up
		frame(); // turn:changed - the player's banner
		dismissBanner();
	};

	/** Takes the unit off the map the way a fight does, and lets the fallout land. */
	const fell = (id: string) => {
		eventBus.dispatch("unit:died", { unitId: id });
		for (let pass = 0; pass < 4; pass++) {
			eventBus.processQueue();
		}
	};

	/** Presses the outcome banner away once it is up. */
	const acknowledge = () => {
		frame(); // the banner goes up on the quiet map
		expect(stateManager.peek()).toBeInstanceOf(OutcomeState);
		const component = banner() as OutcomeComponent;
		component.update({ ...component.read(), acknowledged: true });
		frame(); // acknowledged: the states come down, the outcome is handed on
		frame(); // objective:acknowledged - the campaign or the objective feature answers
		frame(); // what the answer dispatched lands: the campaign's report, or the map's rebuild
	};

	/** Every enemy of the first chapter felled - a rout. */
	const routBellum = () => {
		for (const id of ["bandit-1", "bandit-2", "ruffian-1", "poacher-1"]) {
			fell(id);
		}
	};

	/** Every enemy of the second chapter felled. */
	const routRiver = () => {
		for (const id of ["bandit-chief", "ruffian-1", "poacher-1", "bandit-1", "bandit-2", "ruffian-2"]) {
			fell(id);
		}
	};

	/** A run begun from the title and taken into its first battle. */
	const beginRun = async () => {
		await openTitle();
		choose(TitleRow.NEW_GAME);
		enterBattle();
	};

	beforeEach(() => {
		seedRandom(1);
		slots.clear();
		stateManager.clear();

		const map = new MapFeature();
		const ui = new UIFeature({ demo: false });
		const units = new UnitsFeature();
		const turn = new TurnFeature({ dependencies: [units] });
		const combat = new CombatFeature({ dependencies: [units] });
		const convoyFeature = new ConvoyFeature({ dependencies: [units, ui] });
		const movement = new MovementFeature({ dependencies: [units, ui] });
		const ai = new AIFeature({ dependencies: [units, turn, combat, movement] });
		const objective = new ObjectiveFeature({ dependencies: [units, turn, ai] });
		const feature = new CampaignFeature({ dependencies: [ui, units, convoyFeature, objective] });

		features = [map, ui, units, turn, combat, convoyFeature, movement, ai, objective, feature];

		for (const installed of features) {
			installed.install();
		}

		objectiveSystem = new ObjectiveSystem(6).initialize();

		ready = [];
		started = [];
		cleared = [];
		saved = [];
		slotRead = [];
		slotChosen = [];
		finished = 0;
		stop = [
			eventBus.subscribe("map:ready", (event) => ready.push(event)),
			eventBus.subscribe("campaign:chapterStarted", (event) => started.push(event)),
			eventBus.subscribe("campaign:chapterCleared", (event) => cleared.push(event)),
			eventBus.subscribe("campaign:saved", (event) => saved.push(event)),
			eventBus.subscribe("campaign:slotRead", (event) => slotRead.push(event)),
			eventBus.subscribe("campaign:slotChosen", (event) => slotChosen.push(event)),
			eventBus.subscribe("campaign:finished", () => finished++)
		];
	});

	afterEach(() => {
		for (const unsubscribe of stop) {
			unsubscribe();
		}

		objectiveSystem?.dispose();
		objectiveSystem = null;
		assets.setJson(deploymentAsset("bellum"), bellum);
		assets.setJson(deploymentAsset("river"), river);

		stateManager.clear();

		for (const feature of [...features].reverse()) {
			feature.uninstall();
		}

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventBus.processQueue();
	});

	test("The title screen asks the store and offers only a new game when the slot is empty", async () => {
		await openTitle();

		expect(slotRead).toStrictEqual([expect.objectContaining({ found: false })]);
		expect(stateManager.peek()).toBeInstanceOf(MenuState);
		expect(menu()?.read()).toMatchObject({ id: TITLE_MENU_ID, ids: [TitleRow.NEW_GAME] });

		const screen = stateManager.getState(TitleState).getScreen()?.getComponent(TitleComponent).read();
		expect(screen).toMatchObject({ hasSave: false, menuOpened: true });
		expect(screen?.elapsed).toBeGreaterThan(0);
	});

	test("With a run in the slot the title offers to continue it, first", async () => {
		stash(CampaignComponent.begin(CAMPAIGN_SLOT, "river"));

		await openTitle();

		expect(slotRead).toStrictEqual([expect.objectContaining({ found: true })]);
		expect(menu()?.read()).toMatchObject({ id: TITLE_MENU_ID, ids: [TitleRow.CONTINUE, TitleRow.NEW_GAME] });
	});

	test("Either title row opens the save slot list: every slot, the occupied ones put into words, and backing out returns to the menu", async () => {
		stash({ ...CampaignComponent.begin(2, "river"), playtime: 3_725_000 });

		await openTitle();
		chooseRow(TitleRow.CONTINUE);

		expect(stateManager.getCurrentStates().map((state) => (state.constructor as typeof GameState).type)).toStrictEqual([TitleState.type, SaveSlotState.type]);
		const list = slotList()?.read();
		expect(list).toMatchObject({ purpose: SlotPurpose.CONTINUE, selectedIndex: 1 });
		expect(list?.slots).toHaveLength(SAVE_SLOTS);
		expect(list?.slots.map((slot) => slot.empty)).toStrictEqual([true, false, true]);
		expect(list?.slots[1]).toMatchObject({ slot: 2, chapter: "river", number: 2, playtime: 3_725_000, snapshot: "" });
		expect(["...Is A New Beginning", "...ist ein neuer Anfang"]).toContain(list?.slots[1].title);
		expect(list?.slots[1].savedOn).toContain("2026");

		// An empty slot cannot be continued: the press does nothing.
		const component = slotList() as SaveSlotComponent;
		component.update({ ...component.read(), selectedIndex: 0, confirmed: true });
		frame();
		frame();
		expect(slotChosen).toStrictEqual([]);
		expect(stateManager.peek()).toBeInstanceOf(SaveSlotState);
		expect(slotList()?.read().confirmed).toBe(false);

		// Backing out: the title menu again.
		component.update({ ...component.read(), cancelled: true });
		frame(); // CampaignSystem reports the cancel and pops the list
		frame(); // campaign:slotsClosed - the menu is offered again
		expect(stateManager.peek()).toBeInstanceOf(MenuState);
		expect(menu()?.read()).toMatchObject({ id: TITLE_MENU_ID, ids: [TitleRow.CONTINUE, TitleRow.NEW_GAME] });

		// "New Game" opens the same list on the first empty slot; any slot may be chosen.
		chooseRow(TitleRow.NEW_GAME);
		expect(slotList()?.read()).toMatchObject({ purpose: SlotPurpose.NEW_GAME, selectedIndex: 0 });
		pickSlot(3);
		expect(slotChosen).toStrictEqual([expect.objectContaining({ purpose: SlotPurpose.NEW_GAME, slot: 3 })]);
		expect(campaign()).toMatchObject({ slot: 3, chapter: "bellum", playtime: expect.any(Number) });
	});

	test("Backing out of the title menu puts it straight back up", async () => {
		await openTitle();

		const component = menu() as MenuComponent;
		component.update({ ...component.read(), cancelled: true });
		frame(); // MenuSystem reports the cancel and pops the menu
		expect(stateManager.peek()).toBeInstanceOf(TitleState);

		frame(); // ui:menuCancelled - the menu is offered again
		expect(stateManager.peek()).toBeInstanceOf(MenuState);
		expect(menu()?.read()).toMatchObject({ id: TITLE_MENU_ID });
	});

	test("A new game begins the run at the first chapter, writes it to the slot and puts the chapter card up", async () => {
		await openTitle();
		choose(TitleRow.NEW_GAME);

		expect(stateManager.getCurrentStates().map((state) => (state.constructor as typeof GameState).type)).toStrictEqual([ChapterCardState.type]);
		expect(card()?.read()).toMatchObject({ chapter: "bellum", number: 1, map: "map-fantasy", acknowledged: false });
		expect(["Every End...", "Jedes Ende..."]).toContain(card()?.read().title);
		expect(started).toStrictEqual([expect.objectContaining({ chapter: "bellum", number: 1 })]);

		expect(campaign()).toMatchObject({ slot: CAMPAIGN_SLOT, chapter: "bellum", roster: [], fallen: [], convoy: [], casualties: [] });
		// The title screen is gone with its state.
		expect(world.getEntities().some((entity) => entity.hasComponent(TitleComponent))).toBe(false);

		await tick();
		frame();
		// The framework's record - the world as it stood at the write, still the title - with the run laid into it.
		expect(slots.get(CAMPAIGN_SLOT)).toMatchObject({ id: CAMPAIGN_SLOT, chapter: "bellum", roster: [], currentState: [TitleState.type], randomState: expect.any(Number) });
		expect(slots.get(CAMPAIGN_SLOT)?.entities.some((entity) => CampaignComponent.type in entity.components)).toBe(true);
		expect(saved).toStrictEqual([expect.objectContaining({ slot: CAMPAIGN_SLOT })]);
	});

	test("Acknowledging the card enters the battle for the chapter's scenario, on its map", async () => {
		await openTitle();
		choose(TitleRow.NEW_GAME);

		// Not before the card has been read.
		const component = card() as ChapterCardComponent;
		component.update({ ...component.read(), elapsed: 0 });
		frame(500);
		expect(stateManager.peek()).toBeInstanceOf(ChapterCardState);

		enterBattle();

		expect(topType()).toBe(MapState.type);
		expect(stateManager.getState(MapState).getBattle()).toStrictEqual({ scenario: "bellum", map: "map-fantasy" });
		expect(ready).toStrictEqual([expect.objectContaining({ scenario: "bellum", columns: 48, rows: 24 })]);
		expect(unit("dardan-niveli")).not.toBeNull();
		expect(unit("bandit-1")).not.toBeNull();
		// A fresh run: everyone off their sheet, and already on the roster.
		expect(
			campaign()
				.roster.map((member) => member.id)
				.sort()
		).toStrictEqual(["dardan-niveli", "hasan-eyletmez"]);
		expect(sheet("dardan-niveli").read().level).toBe(buildUnit(dardanDocument as UnitDocument).level);
		expect(campaign().casualties).toStrictEqual([]);
	});

	test("A won chapter records the survivors and the convoy, moves the run on, writes it and puts the next card up", async () => {
		await beginRun();

		// A battle's worth of change: Dardan grew and was hurt, something went to the convoy.
		const dardan = sheet("dardan-niveli");
		dardan.update({ ...dardan.read(), level: 5, currentHP: 2, hasMoved: true });
		const spare = { ...dardan.read().inventory[0], equipped: false };
		convoy().store(spare);

		routBellum();
		acknowledge();

		// The next chapter's card, and the run on it.
		expect(stateManager.getCurrentStates().map((state) => (state.constructor as typeof GameState).type)).toStrictEqual([ChapterCardState.type]);
		expect(card()?.read()).toMatchObject({ chapter: "river", number: 2, map: "map-river" });
		expect(cleared).toStrictEqual([expect.objectContaining({ chapter: "bellum", next: "river" })]);
		expect(started.map((event) => event.chapter)).toStrictEqual(["bellum", "river"]);

		const record = campaign();
		expect(record).toMatchObject({ chapter: "river", fallen: [], casualties: [] });
		expect(record.roster.map((veteran) => veteran.id).sort()).toStrictEqual(["dardan-niveli", "hasan-eyletmez"]);
		expect(CampaignComponent.veteran(record, "dardan-niveli")).toMatchObject({ level: 5, currentHP: dardan.read().stats.hp, hasMoved: false });
		expect(record.convoy).toStrictEqual([spare]);

		// The last battle is torn down with its map.
		expect(unitsInWorld(world)).toStrictEqual([]);
		expect(world.entityWith(ObjectiveComponent)).toBeNull();

		await tick();
		frame();
		expect(slots.get(CAMPAIGN_SLOT)).toMatchObject({ chapter: "river" });
		expect(saved).toHaveLength(2);
		// The slot carries how long the run has been played and a picture of the screen it was written from.
		expect(slots.get(CAMPAIGN_SLOT)?.playtime).toBeGreaterThan(0);
		expect(typeof slots.get(CAMPAIGN_SLOT)?.screenshot).toBe("string");

		// Into the next battle: the veterans over their sheets, the convoy refilled, the new scenario's enemies.
		enterBattle();
		expect(topType()).toBe(MapState.type);
		expect(ready.at(-1)).toMatchObject({ scenario: "river", columns: 20, rows: 15 });
		expect(sheet("dardan-niveli").read()).toMatchObject({ level: 5, currentHP: dardan.read().stats.hp, hasMoved: false });
		expect(convoy().read().items).toStrictEqual([spare]);
		expect(unit("bandit-chief")?.getComponent(UnitComponent).read()).toMatchObject({ faction: "enemy", boss: true });
		// Maksimo joins here: off his sheet, and enrolled.
		expect(unit("maksimo-auditore")).not.toBeNull();
		expect(
			campaign()
				.roster.map((member) => member.id)
				.sort()
		).toStrictEqual(["dardan-niveli", "hasan-eyletmez", "maksimo-auditore"]);
		expect(world.entityWith(ObjectiveComponent)?.getComponent(ObjectiveComponent).read()).toMatchObject({ win: "rout" });
	});

	test("A unit that fell in a won chapter stays fallen: it is not deployed again", async () => {
		await beginRun();

		fell("hasan-eyletmez");
		expect(campaign().casualties).toStrictEqual(["hasan-eyletmez"]);

		routBellum();
		acknowledge();

		expect(campaign()).toMatchObject({ chapter: "river", fallen: ["hasan-eyletmez"], casualties: [] });
		expect(campaign().roster.map((veteran) => veteran.id)).not.toContain("hasan-eyletmez");

		enterBattle();
		expect(unit("dardan-niveli")).not.toBeNull();
		expect(unit("maksimo-auditore")).not.toBeNull();
		expect(unit("hasan-eyletmez")).toBeNull();
	});

	test("A lost chapter starts over from the same record, its casualties forgotten", async () => {
		await beginRun();

		fell("hasan-eyletmez");
		expect(campaign().casualties).toStrictEqual(["hasan-eyletmez"]);

		// The commander falls: a defeat, which the objective feature answers with a restart.
		fell("dardan-niveli");
		acknowledge(); // ... and the battle is rebuilt
		frame(); // turn:changed - the banner
		dismissBanner();

		expect(topType()).toBe(MapState.type);
		expect(ready.map((event) => event.scenario)).toStrictEqual(["bellum", "bellum"]);
		expect(unit("dardan-niveli")).not.toBeNull();
		expect(unit("hasan-eyletmez")).not.toBeNull();
		expect(campaign()).toMatchObject({ chapter: "bellum", fallen: [], casualties: [] });
		expect(cleared).toStrictEqual([]);
		expect(started).toHaveLength(1);
	});

	test("Continue takes the run up at the top of the chapter the slot left it on, veterans and fallen included", async () => {
		const veteran = { ...buildUnit(dardanDocument as UnitDocument), level: 7, currentHP: 1 };
		stash({ ...CampaignComponent.begin(CAMPAIGN_SLOT, "river"), roster: [veteran], fallen: ["hasan-eyletmez"], playtime: 9000 }, "2026-09-19T00:00:00.000Z", 4242);

		await openTitle();
		choose(TitleRow.CONTINUE);

		expect(slotChosen).toStrictEqual([expect.objectContaining({ purpose: SlotPurpose.CONTINUE, slot: CAMPAIGN_SLOT })]);
		expect(card()?.read()).toMatchObject({ chapter: "river", number: 2, map: "map-river" });
		expect(campaign()).toMatchObject({ chapter: "river", fallen: ["hasan-eyletmez"] });
		expect(campaign().playtime).toBeGreaterThanOrEqual(9000);
		// The dice roll on from where the save left them.
		expect(getRandomState()).toBe(4242);
		// Taking a run up is not a write.
		expect(saved).toStrictEqual([]);

		enterBattle();
		expect(ready).toStrictEqual([expect.objectContaining({ scenario: "river" })]);
		expect(sheet("dardan-niveli").read()).toMatchObject({ level: 7, currentHP: veteran.stats.hp });
		expect(unit("hasan-eyletmez")).toBeNull();
		expect(unit("maksimo-auditore")).not.toBeNull();
	});

	test("A slot on a chapter this campaign does not have starts a new run instead", async () => {
		stash(CampaignComponent.begin(CAMPAIGN_SLOT, "nowhere"));

		await openTitle();
		choose(TitleRow.CONTINUE);

		expect(card()?.read()).toMatchObject({ chapter: "bellum", number: 1 });
		expect(campaign().chapter).toBe("bellum");
	});

	test("The last chapter won finishes the run and returns to the title", async () => {
		await beginRun();

		routBellum();
		acknowledge();
		enterBattle();
		expect(ready.at(-1)?.scenario).toBe("river");

		routRiver();
		acknowledge();

		expect(finished).toBe(1);
		expect(cleared.at(-1)).toMatchObject({ chapter: "river", next: "" });
		expect(stateManager.getCurrentStates().map((state) => (state.constructor as typeof GameState).type)).toStrictEqual([TitleState.type]);
		expect(unitsInWorld(world)).toStrictEqual([]);

		// And the title asks the store again, which still holds the run at its last chapter.
		await tick();
		frame();
		expect(stateManager.peek()).toBeInstanceOf(MenuState);
		expect(menu()?.read().ids).toStrictEqual([TitleRow.CONTINUE, TitleRow.NEW_GAME]);
		expect(slots.get(CAMPAIGN_SLOT)?.chapter).toBe("river");
	});

	test("Without a run under way a decided battle is the objective feature's to start over", () => {
		// The map entered straight, the way the game ran before there was a campaign.
		stateManager.switch(MapState);
		frame(); // map:ready
		frame(); // turn:changed
		dismissBanner();

		expect(world.entityWith(CampaignComponent)).toBeNull();
		fell("dardan");
		acknowledge(); // ... and the battle is rebuilt

		expect(topType()).toBe(MapState.type);
		expect(ready).toHaveLength(2);
		expect(world.entityWith(ObjectiveComponent)?.getComponent(ObjectiveComponent).read().outcome).toBe("");
		expect(unit("dardan")).not.toBeNull();
	});
});
