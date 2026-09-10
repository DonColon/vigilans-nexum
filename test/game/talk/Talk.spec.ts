import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { TalkConfirmedEvent, TalkFinishedEvent, TalkRequestedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { UnitMenuRow } from "@/game/movement/model/UnitMenus";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { TalkChoiceComponent } from "@/game/talk/components/TalkChoiceComponent";
import { TalkComponent } from "@/game/talk/components/TalkComponent";
import { TalkState } from "@/game/talk/states/TalkState";
import { TalkChoiceSystem } from "@/game/talk/systems/TalkChoiceSystem";
import { conversationBetween, conversationDialog, conversationSides, pageText, parseConversations, partnersOf, ConversationsDocument } from "@/game/talk/model/Conversations";
import { TalkSystem } from "@/game/talk/systems/TalkSystem";
import { TalkFeature } from "@/game/talk/TalkFeature";
import { DialogComponent } from "@/game/ui/components/DialogComponent";
import { DialogState } from "@/game/ui/states/DialogState";
import { DialogSide } from "@/game/ui/model/UILayout";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";
import skirmishConversations from "@/assets/data/conversations/skirmish.conversations.json";

/** The scenario sheet, and a minimal one built by hand for the edge cases. */
const sheet = (conversations: unknown[]) => ({ format: "vigilans-conversations", version: 1, conversations }) as unknown as ConversationsDocument;

const page = (speaker: string, de: string, en = de) => ({ speaker, text: { de, en } });

suite("Conversation Sheet Test Suite", () => {
	test("The shipped sheet pairs Dardan with Elira, and Elira with Hasan", () => {
		const conversations = parseConversations(skirmishConversations as ConversationsDocument);

		expect(conversations.map((entry) => entry.id)).toStrictEqual(["dardan-elira", "elira-hasan"]);
		expect(conversations[0].between).toStrictEqual(["dardan", "elira"]);
		expect(conversations[0].pages.length).toBeGreaterThan(1);

		// The two voices alternate, which is what per-page speakers are for.
		expect(new Set(conversations[0].pages.map((entry) => entry.speaker))).toStrictEqual(new Set(["dardan", "elira"]));

		// Elira is in both, which is what makes the choice step reachable.
		expect(partnersOf(conversations, "elira").sort()).toStrictEqual(["dardan", "hasan"]);
	});

	test("The script is not broken by hand - the box wraps it itself", () => {
		const conversations = parseConversations(skirmishConversations as ConversationsDocument);

		for (const conversation of conversations) {
			for (const entry of conversation.pages) {
				for (const [locale, text] of Object.entries(entry.text)) {
					expect(text, `${conversation.id} (${locale})`).not.toContain(String.fromCharCode(10));
				}
			}
		}
	});

	test("Each speaker holds an end of the screen, the opener on top", () => {
		const [conversation] = parseConversations(skirmishConversations as ConversationsDocument);

		// Dardan opens, so his pages sit along the top and Elira's along the bottom.
		expect(conversationSides(conversation)).toStrictEqual([DialogSide.TOP, DialogSide.BOTTOM, DialogSide.TOP, DialogSide.BOTTOM]);
		expect(conversationDialog(conversation, "de", "en", () => null).sides).toStrictEqual(conversationSides(conversation));

		// The one who answers first keeps the bottom whoever they are.
		const [, second] = parseConversations(skirmishConversations as ConversationsDocument);
		expect(second.pages[0].speaker).toBe("hasan");
		expect(conversationSides(second)).toStrictEqual([DialogSide.TOP, DialogSide.BOTTOM, DialogSide.TOP]);
	});

	test("A pair is found whichever way round it is asked for", () => {
		const conversations = parseConversations(skirmishConversations as ConversationsDocument);

		expect(conversationBetween(conversations, "dardan", "elira")?.id).toBe("dardan-elira");
		expect(conversationBetween(conversations, "elira", "dardan")?.id).toBe("dardan-elira");
		expect(conversationBetween(conversations, "dardan", "hasan")).toBeNull();
		expect(partnersOf(conversations, "dardan")).toStrictEqual(["elira"]);
		expect(partnersOf(conversations, "besnik")).toStrictEqual([]);
	});

	test("Text falls back through the locales rather than showing an empty box", () => {
		const entry = page("dardan", "Guten Tag", "Good day");

		expect(pageText(entry, "de", "en")).toBe("Guten Tag");
		expect(pageText(entry, "en", "de")).toBe("Good day");
		expect(pageText(entry, "fr", "en")).toBe("Good day"); // the fallback locale
		expect(pageText({ speaker: "dardan", text: { pt: "Bom dia" } }, "fr", "en")).toBe("Bom dia"); // whatever it was written in
	});

	test("A conversation lays out as a textbox with a name per page", () => {
		const [conversation] = parseConversations(sheet([{ id: "a-b", between: ["dardan", "elira"], pages: [page("dardan", "Eins"), page("elira", "Zwei")] }]));

		const dialog = conversationDialog(conversation, "de", "en", (id) => (id === "dardan" ? "Dardan Niveli" : null));

		expect(dialog.id).toBe("talk-a-b");
		expect(dialog.pages).toStrictEqual(["Eins", "Zwei"]);
		// A resolved name where there is a unit; the raw id rather than nothing where there is not.
		expect(dialog.speakers).toStrictEqual(["Dardan Niveli", "elira"]);
	});

	test("A malformed sheet is rejected", () => {
		expect(() => parseConversations({ ...sheet([]), format: "something-else" } as unknown as ConversationsDocument)).toThrow(/expected "vigilans-conversations"/);
		expect(() => parseConversations({ ...sheet([]), version: 2 } as unknown as ConversationsDocument)).toThrow(/version 2/);
		expect(() => parseConversations(sheet([{ id: "", between: ["a", "b"], pages: [page("a", "x")] }]))).toThrow(/missing its id/);
		expect(() => parseConversations(sheet([{ id: "solo", between: ["a"], pages: [page("a", "x")] }]))).toThrow(/exactly two units/);
		expect(() => parseConversations(sheet([{ id: "self", between: ["a", "a"], pages: [page("a", "x")] }]))).toThrow(/pairs a unit with itself/);
		expect(() => parseConversations(sheet([{ id: "quiet", between: ["a", "b"], pages: [] }]))).toThrow(/has no pages/);
		expect(() => parseConversations(sheet([{ id: "nameless", between: ["a", "b"], pages: [{ speaker: "", text: { de: "x" } }] }]))).toThrow(/missing its speaker/);
		expect(() => parseConversations(sheet([{ id: "mute", between: ["a", "b"], pages: [{ speaker: "a", text: {} }] }]))).toThrow(/no text in any locale/);

		const twice = [
			{ id: "same", between: ["a", "b"], pages: [page("a", "x")] },
			{ id: "same", between: ["c", "d"], pages: [page("c", "y")] }
		];
		expect(() => parseConversations(sheet(twice))).toThrow(/defined twice/);
	});
});

/**
 * Fire Emblem's "Talk" end to end: Dardan and Elira are deployed side by side
 * and the scenario writes them a conversation, so his command menu offers it.
 * Choosing it plays the textbox; talking is free, so he still has his turn - but
 * the pair only has it once.
 */
suite("Unit Talk Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("unit-talk-test", { dimension: { width: 1280, height: 720 }, layers: { 1: "background", 2: "gameplay", 3: "ui" } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let talk: TalkFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const unitData = (id: string) => unit(id).getComponent(UnitComponent).read();

	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();
	const talkState = () => (TalkSystem.inWorld(world) as Entity).getComponent(TalkComponent);
	const dialog = () => (stateManager.getState(DialogState).getDialog() as Entity).getComponent(DialogComponent);

	const cursorTile = () => cursor.getComponent(GridPositionComponent).read();
	const choice = () => (stateManager.getState(TalkState).getChoice() as Entity).getComponent(TalkChoiceComponent);

	/** Runs TalkChoiceSystem once, so a flagged confirm / cancel is resolved and its fallout settles. */
	const pumpChoice = () => {
		const system = new TalkChoiceSystem(10);
		system.execute(16, 0);
		eventSystem.processQueue(); // talk:confirmed / talk:cancelled
		eventSystem.processQueue();
		system.dispose();
	};

	/** Points the choice at one of the units in reach, the way the cycling commands would. */
	const pointAt = (partnerIndex: number) => {
		choice().update({ ...choice().read(), partnerIndex });
		pumpChoice();
	};

	/** Puts a unit on a tile - to set up who is standing beside whom. */
	const placeUnit = (id: string, column: number, row: number) => unit(id).getComponent(GridPositionComponent).update({ column, row });

	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(10_000);
		eventSystem.processQueue();
		walkSystem.dispose();
	};

	/** Picks a unit up and sets it back down where it stands, leaving its command menu open. */
	const openCommandMenu = (column: number, row: number) => {
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column, row, terrain: "plain" });
		eventSystem.processQueue();
		finishWalk();
	};

	/** Chooses "Talk", which opens the "who am I talking to?" choice. */
	const chooseTalk = () => {
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.TALK, index: 0, item: i18n("menu.talk") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver talk:requested
	};

	/** Settles on whoever the cursor is pointing at, which plays the conversation. */
	const confirmPartner = () => {
		choice().update({ ...choice().read(), confirmed: true });
		pumpChoice();
	};

	/** Chooses "Talk" and settles on the first unit in reach - the everyday path. */
	const talkToFirst = () => {
		chooseTalk();
		confirmPartner();
	};

	/** Reads to the end of the box and dismisses it, the way the advance command would. */
	const closeDialog = () => {
		dialog().update({ ...dialog().read(), closed: true });
		eventSystem.dispatch("ui:dialogClosed", { dialog: dialog().read().id });
		stateManager.pop();
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver talk:finished
	};

	beforeEach(() => {
		stateManager.clear();

		map = world.createEntity();
		map.addComponent(GridComponent, GridSystem.of(parseTileMap(sketch), 24));
		map.addComponent(TransformComponent, { ...identityTransform });

		cursor = world.createEntity();
		cursor.addComponent(CursorComponent, {});
		cursor.addComponent(GridPositionComponent, { column: 4, row: 10 });

		units = new UnitsFeature();
		units.install();
		ui = new UIFeature({ demo: false });
		ui.install();
		talk = new TalkFeature({ dependencies: [units, ui] });
		talk.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();
	});

	afterEach(() => {
		movement.uninstall();
		talk.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	test("map:ready reads the scenario's conversations onto the map", () => {
		expect(
			talkState()
				.read()
				.conversations.map((entry) => entry.id)
		).toStrictEqual(["dardan-elira", "elira-hasan"]);
		expect(talkState().read().talked).toStrictEqual([]);
	});

	test("The command menu offers Talk to a unit with something left to say", () => {
		openCommandMenu(4, 10); // Dardan, beside Elira

		expect(menu()?.items).toStrictEqual([i18n("menu.talk"), i18n("menu.items"), i18n("menu.trade"), i18n("menu.wait")]);
	});

	test("Talk is left out when nobody beside the unit has a conversation with it", () => {
		// Elira is beside Dardan, so she is offered it too - but Hasan is not
		// written into any conversation.
		openCommandMenu(5, 10);
		expect(menu()?.items).toContain(i18n("menu.talk"));

		eventSystem.dispatch("ui:menuCancelled", { menu: "unit-command" });
		eventSystem.processQueue();

		openCommandMenu(4, 14); // Hasan - and he is an enemy, so he is not picked up at all
		expect(menu()?.items).not.toContain(i18n("menu.talk"));
	});

	test("Talk is left out once the unit walks away from its partner", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 12, terrain: "plain" }); // two tiles from Elira
		eventSystem.processQueue();
		finishWalk();

		expect(menu()?.items).not.toContain(i18n("menu.talk"));
	});

	test("Choosing Talk plays the conversation, a page and a speaker at a time", () => {
		let requested: TalkRequestedEvent | null = null;
		eventSystem.subscribe("talk:requested", (event) => (requested = event));

		openCommandMenu(4, 10);
		talkToFirst();

		expect(requested).toMatchObject({ unitId: "dardan", partnerId: "elira" });
		expect(stateManager.peek()).toBeInstanceOf(DialogState);

		const box = dialog().read();
		expect(box.id).toBe("talk-dardan-elira");
		expect(box.pages.length).toBeGreaterThan(1);
		expect(box.pages.every((text) => text.length > 0)).toBe(true);

		// The name above the box is the one on the unit's sheet, and it changes hands.
		expect(box.speakers[0]).toBe(unitData("dardan").name);
		expect(box.speakers[1]).toBe(unitData("elira").name);
	});

	test("Talking costs the unit nothing - it still has its turn afterwards", () => {
		let finished: TalkFinishedEvent | null = null;
		eventSystem.subscribe("talk:finished", (event) => (finished = event));
		let acted: string | null = null;
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		openCommandMenu(4, 10);
		talkToFirst();
		closeDialog();

		expect(finished).toMatchObject({ unitId: "dardan", partnerId: "elira", conversationId: "dardan-elira" });
		expect(acted).toBeNull();
		expect(unitData("dardan").hasMoved).toBe(false);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(true);
		expect(menu()?.id).toBe("unit-command"); // and he is asked what to do next
	});

	test("... so he can still Wait after talking, and that does spend him", () => {
		let acted: string | null = null;
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		openCommandMenu(4, 10);
		talkToFirst();
		closeDialog();

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.WAIT, index: 3, item: i18n("menu.wait") });
		eventSystem.processQueue();
		eventSystem.processQueue();

		expect(acted).toBe("dardan");
		expect(unitData("dardan").hasMoved).toBe(true);
	});

	test("A conversation happens once - afterwards neither of them is offered it again", () => {
		openCommandMenu(4, 10);
		talkToFirst();
		closeDialog();

		expect(talkState().read().talked).toStrictEqual(["dardan-elira"]);
		expect(menu()?.items).not.toContain(i18n("menu.talk"));

		// ... and not from the other side either.
		eventSystem.dispatch("ui:menuCancelled", { menu: "unit-command" });
		eventSystem.processQueue();

		openCommandMenu(5, 10);
		expect(menu()?.items).not.toContain(i18n("menu.talk"));
	});

	test("A talk that has been used up cannot be played again by asking for it directly", () => {
		openCommandMenu(4, 10);
		talkToFirst();
		closeDialog();

		eventSystem.dispatch("talk:requested", { unitId: "dardan", partnerId: "elira" });
		eventSystem.processQueue();

		expect(stateManager.peek()).not.toBeInstanceOf(TalkState);
		expect(stateManager.peek()).not.toBeInstanceOf(DialogState);
	});

	test("With several to talk to, the cursor picks between them first", () => {
		let confirmed: TalkConfirmedEvent | null = null;
		eventSystem.subscribe("talk:confirmed", (event) => (confirmed = event));

		// Elira is written into a conversation with each of them; stand her between.
		placeUnit("hasan", 6, 10);
		openCommandMenu(5, 10);
		chooseTalk();

		expect(stateManager.peek()).toBeInstanceOf(TalkState);
		expect(choice().read()).toMatchObject({ unitId: "elira", partnerIds: ["dardan", "hasan"], partnerId: "dardan" });

		// The cursor sits on whoever is pointed at, so the choice is read off the map.
		pumpChoice();
		expect(cursorTile()).toMatchObject({ column: 4, row: 10 });

		pointAt(1);
		expect(choice().read().partnerId).toBe("hasan");
		expect(cursorTile()).toMatchObject({ column: 6, row: 10 });

		// Confirming plays that conversation, not the one it started on.
		choice().update({ ...choice().read(), confirmed: true });
		pumpChoice();

		expect(confirmed).toMatchObject({ unitId: "elira", partnerId: "hasan" });
		expect(stateManager.peek()).toBeInstanceOf(DialogState);
		expect(dialog().read().id).toBe("talk-elira-hasan");
		expect(cursorTile()).toMatchObject({ column: 5, row: 10 }); // back on Elira
	});

	test("Backing out of the choice talks to nobody and puts the command menu back", () => {
		placeUnit("hasan", 6, 10);
		openCommandMenu(5, 10);
		chooseTalk();

		choice().update({ ...choice().read(), cancelled: true });
		pumpChoice();

		expect(stateManager.peek()).not.toBeInstanceOf(TalkState);
		expect(cursorTile()).toMatchObject({ column: 5, row: 10 });
		expect(talkState().read().talked).toStrictEqual([]);
		expect(unitData("elira").hasMoved).toBe(false);
		expect(menu()?.id).toBe("unit-command");
	});

	test("The choice opens even with only one to talk to, the way a trade always does", () => {
		openCommandMenu(4, 10); // Dardan has only Elira

		chooseTalk();

		// The step still shows, so the command always says who it is about to act
		// on before it acts.
		expect(stateManager.peek()).toBeInstanceOf(TalkState);
		expect(choice().read()).toMatchObject({ unitId: "dardan", partnerIds: ["elira"], partnerId: "elira" });

		pumpChoice();
		expect(cursorTile()).toMatchObject({ column: 5, row: 10 }); // on Elira

		confirmPartner();
		expect(stateManager.peek()).toBeInstanceOf(DialogState);
		expect(dialog().read().id).toBe("talk-dardan-elira");
		expect(cursorTile()).toMatchObject({ column: 4, row: 10 }); // back on Dardan
	});

	test("Backing out of a single-partner choice talks to nobody", () => {
		openCommandMenu(4, 10);
		chooseTalk();

		choice().update({ ...choice().read(), cancelled: true });
		pumpChoice();

		expect(stateManager.peek()).not.toBeInstanceOf(TalkState);
		expect(talkState().read().talked).toStrictEqual([]);
		expect(unitData("dardan").hasMoved).toBe(false);
		expect(menu()?.id).toBe("unit-command");
	});

	test("The box changes ends as the conversation changes hands", () => {
		openCommandMenu(4, 10);
		talkToFirst();

		// Dardan opens, so his pages sit along the top and hers along the bottom.
		expect(dialog().read().sides).toStrictEqual([DialogSide.TOP, DialogSide.BOTTOM, DialogSide.TOP, DialogSide.BOTTOM]);
	});

	test("A pair with nothing written for them is never offered a talk", () => {
		const talkData = talkState().read();

		expect(TalkSystem.available(talkData, UnitSystem.inWorld(world), unit("hasan"))).toBeNull();
		expect(TalkSystem.canTalk(talkData, UnitSystem.inWorld(world), unit("dardan"))).toBe(true);
	});

	test("map:closed clears the conversations", () => {
		expect(TalkSystem.inWorld(world)).not.toBeNull();

		eventSystem.dispatch("map:closed", {});
		eventSystem.processQueue();

		expect(TalkSystem.inWorld(world)).toBeNull();
	});
});
