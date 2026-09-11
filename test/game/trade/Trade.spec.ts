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
import { TradeClosedEvent, TradeRequestedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { parseTileMap } from "@/game/map/model/TileMaps";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { MovementFeature } from "@/game/movement/MovementFeature";
import { itemsRequest, UnitMenuRow } from "@/game/movement/model/UnitMenus";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { NOTHING_HELD, TradeComponent, TradeData, TradeSide } from "@/game/trade/components/TradeComponent";
import { tradeSlots } from "@/game/trade/model/TradeScreen";
import { TradeState } from "@/game/trade/states/TradeState";
import { TradeSystem } from "@/game/trade/systems/TradeSystem";
import { TradeFeature } from "@/game/trade/TradeFeature";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { UIFeature } from "@/game/ui/UIFeature";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { isUsableEntry } from "@/game/units/model/Inventory";
import { INVENTORY_SIZE, UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { UnitsFeature } from "@/game/units/UnitsFeature";

/**
 * Fire Emblem's trade end to end: Dardan (4,10) and Elira (5,10) are deployed
 * side by side, so his command menu offers "Trade". That first parks the map
 * cursor on the ally he would trade with; confirming opens both packs, where a
 * confirm picks an entry up and a second one on the other side hands it over.
 * Trading is free, so he still has his turn when the screen closes.
 */
suite("Unit Trade Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(GridComponent);
	world.registerComponent(GridPositionComponent);
	world.registerComponent(CursorComponent);

	new Display("unit-trade-test", { dimension: { width: 1280, height: 720 } });
	const stateManager = new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	// All plain, big enough to hold the deployment.
	const sketch = new Array(16).fill(".".repeat(8));

	let units: UnitsFeature;
	let ui: UIFeature;
	let trade: TradeFeature;
	let movement: MovementFeature;
	let map: Entity;
	let cursor: Entity;

	const unit = (id: string) => UnitSystem.byId(UnitSystem.inWorld(world), id) as Entity;
	const sheet = (id: string) => unit(id).getComponent(UnitComponent).read();
	const ids = (id: string) => sheet(id).inventory.map((entry) => entry.id);
	const cursorTile = () => cursor.getComponent(GridPositionComponent).read();

	const menu = () => (stateManager.peek() as MenuState).getMenu()?.getComponent(MenuComponent).read();
	const screen = () => (stateManager.getState(TradeState).getTrade() as Entity).getComponent(TradeComponent);
	const state = () => screen().read();

	/** Runs TradeSystem once, so a flagged confirm / cancel is resolved and its fallout settles. */
	const pumpTrade = () => {
		const system = new TradeSystem(10);
		system.execute(16, 0);
		eventSystem.processQueue(); // trade:closed -> MovementFeature
		eventSystem.processQueue(); // unit:acted
		system.dispose();
	};

	/** Flags a confirm and lets the system act on it, the way the confirm command would. */
	const confirm = () => {
		screen().update({ ...state(), confirmed: true });
		pumpTrade();
	};

	/** Flags a cancel the way TradeCancelCommand does: drop what is held, else step the phase back. */
	const cancel = () => {
		const data = state();

		if (data.heldSide !== NOTHING_HELD) {
			screen().update({ ...data, heldSide: NOTHING_HELD, heldSlot: NOTHING_HELD });
		} else if (data.phase === "trade") {
			screen().update({ ...data, phase: "partner" });
		} else {
			screen().update({ ...data, cancelled: true });
		}

		pumpTrade();
	};

	/** Points the partner cursor at one of the allies in reach, the way the cycling commands would. */
	const pointAt = (partnerIndex: number) => {
		screen().update({ ...state(), partnerIndex });
		pumpTrade();
	};

	/** Puts the slot cursor on a slot of one pack and confirms it. */
	const confirmSlot = (side: TradeSide, slot: number) => {
		const component = screen();
		const data: TradeData = { ...component.read(), side, confirmed: true };

		component.update(side === TradeSide.PARTNER ? { ...data, partnerSlot: slot } : { ...data, unitSlot: slot });
		pumpTrade();
	};

	const finishWalk = () => {
		const walkSystem = new UnitWalkSystem(8);
		walkSystem.execute(10_000);
		eventSystem.processQueue();
		walkSystem.dispose();
	};

	/** Picks Dardan up and sets him back down where he stands, leaving his command menu open. */
	const openCommandMenu = () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		finishWalk();
	};

	/** Chooses "Trade", which opens the screen on its partner step. */
	const chooseTrade = () => {
		openCommandMenu();
		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.TRADE, index: 1, item: i18n("menu.trade") });
		eventSystem.processQueue();
		eventSystem.processQueue(); // deliver trade:requested
	};

	/** ... and locks the pointed-at ally in, which opens both packs. */
	const openPacks = () => {
		chooseTrade();
		confirm();
	};

	/** Turns an enemy into a third player unit standing on Dardan's other side. */
	const allyBesideDardan = (id: string) => {
		const entity = unit(id);
		const component = entity.getComponent(UnitComponent);

		component.update({ ...component.read(), faction: UnitFaction.PLAYER });
		entity.getComponent(GridPositionComponent).update({ column: 3, row: 10 });
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
		trade = new TradeFeature({ dependencies: [units] });
		trade.install();
		movement = new MovementFeature({ dependencies: [units, ui] });
		movement.install();

		eventSystem.dispatch("map:ready", { mapId: map.getID(), columns: 8, rows: 16 });
		eventSystem.processQueue();

		// Dardan's sheet also carries the fort's keys; this suite is about the
		// pack flow, so it works on his classic four slots and leaves them off.
		const dardanComponent = unit("dardan").getComponent(UnitComponent);
		dardanComponent.update({ ...dardanComponent.read(), inventory: dardanComponent.read().inventory.slice(0, 4) });
	});

	afterEach(() => {
		movement.uninstall();
		trade.uninstall();
		ui.uninstall();
		units.uninstall();
		stateManager.clear();

		for (const entity of world.getEntities()) {
			world.unregisterEntity(entity);
		}

		eventSystem.processQueue();
	});

	test("The command menu offers Trade with an ally standing next to the unit", () => {
		openCommandMenu();

		expect(menu()?.items).toStrictEqual([i18n("menu.items"), i18n("menu.trade"), i18n("menu.wait")]);
	});

	test("Trade is left out once the unit has walked away from its ally", () => {
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 10, terrain: "plain" });
		eventSystem.processQueue();
		eventSystem.dispatch("map:tileConfirmed", { column: 4, row: 12, terrain: "plain" }); // two tiles from Elira
		eventSystem.processQueue();
		finishWalk();

		expect(menu()?.items).toStrictEqual([i18n("menu.items"), i18n("menu.wait")]);
	});

	test("Trade opens on the partner step, with no packs on screen yet", () => {
		let requested: TradeRequestedEvent | null = null;
		eventSystem.subscribe("trade:requested", (event) => (requested = event));

		chooseTrade();

		expect(requested).toMatchObject({ unitId: "dardan", partnerId: "elira" });
		expect(stateManager.peek()).toBeInstanceOf(TradeState);
		expect(state()).toMatchObject({ phase: "partner", unitId: "dardan", partnerIds: ["elira"], partnerId: "elira" });
	});

	test("The map cursor sits on the ally being traded with, and goes back on cancel", () => {
		chooseTrade();
		pumpTrade();
		expect(cursorTile()).toMatchObject({ column: 5, row: 10 }); // Elira's tile

		cancel();
		expect(cursorTile()).toMatchObject({ column: 4, row: 10 }); // back on Dardan
	});

	test("Any direction moves the cursor between the allies in reach", () => {
		allyBesideDardan("besnik"); // now Elira (5,10) and Besnik (3,10) are both beside him
		chooseTrade();
		pumpTrade();

		expect(state()).toMatchObject({ phase: "partner", partnerIds: ["elira", "besnik"], partnerId: "elira" });
		expect(cursorTile()).toMatchObject({ column: 5, row: 10 });

		pointAt(1);
		expect(state().partnerId).toBe("besnik");
		expect(cursorTile()).toMatchObject({ column: 3, row: 10 });

		// Confirming opens that ally's pack, not the one it started on.
		confirm();
		expect(state()).toMatchObject({ phase: "trade", partnerId: "besnik" });
	});

	/** What a pack panel shows: the carried ids, then an empty slot for every one left over. */
	const slotIds = (carried: string[]) => [...carried, ...new Array<null>(INVENTORY_SIZE - carried.length).fill(null)];

	/** The same padding for a per-slot flag - an empty slot is never flagged. */
	const slotFlags = (carried: boolean[]) => [...carried, ...new Array<boolean>(INVENTORY_SIZE - carried.length).fill(false)];

	test("Confirming the partner opens both packs, a slot at a time and empty slots included", () => {
		openPacks();

		expect(state()).toMatchObject({ phase: "trade", side: TradeSide.UNIT, unitSlot: 0, partnerSlot: 0, heldSide: NOTHING_HELD });
		expect(tradeSlots(sheet("dardan")).map((entry) => entry?.id ?? null)).toStrictEqual(slotIds(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]));
		expect(tradeSlots(sheet("elira")).map((entry) => entry?.id ?? null)).toStrictEqual(slotIds(["iron-axe", "bronze-axe", "concoction"]));
		expect(tradeSlots(sheet("elira"))).toHaveLength(INVENTORY_SIZE);
	});

	test("Confirm picks an entry up; confirm on the other pack swaps the two", () => {
		openPacks();

		confirmSlot(TradeSide.UNIT, 1); // Dardan's iron sword
		expect(state()).toMatchObject({ heldSide: TradeSide.UNIT, heldSlot: 1 });
		expect(ids("dardan")).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]);

		confirmSlot(TradeSide.PARTNER, 2); // onto Elira's concoction
		expect(ids("dardan")).toStrictEqual(["bronze-sword", "concoction", "iron-blade", "vulnerary"]);
		expect(ids("elira")).toStrictEqual(["iron-axe", "bronze-axe", "iron-sword"]);
		expect(state().heldSide).toBe(NOTHING_HELD);
	});

	test("An entry put down on an empty slot is simply handed over", () => {
		openPacks();

		confirmSlot(TradeSide.UNIT, 3); // the vulnerary
		confirmSlot(TradeSide.PARTNER, 4); // an empty slot of Elira's pack

		expect(ids("dardan")).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade"]);
		expect(ids("elira")).toStrictEqual(["iron-axe", "bronze-axe", "concoction", "vulnerary"]);
	});

	test("A weapon the receiving class cannot wield is carried, not readied", () => {
		openPacks();

		confirmSlot(TradeSide.PARTNER, 1); // Elira's bronze axe
		confirmSlot(TradeSide.UNIT, 4); // onto Dardan's free slot

		const axe = sheet("dardan").inventory[4];
		expect(axe.id).toBe("bronze-axe");
		expect(axe.equippable).toBe(false); // a swordsman cannot swing it
		expect(sheet("dardan").weapon?.id).toBe("bronze-sword"); // still his own sword
	});

	test("A traded weapon the class cannot wield reads as greyed out in both lists", () => {
		openPacks();

		confirmSlot(TradeSide.PARTNER, 1); // Elira's bronze axe
		confirmSlot(TradeSide.UNIT, 4); // onto Dardan's free slot

		// What the trade panels colour a slot by - his own consumables stay live, and
		// an empty slot is nobody's dead weight.
		const greyed = (id: string) => tradeSlots(sheet(id)).map((entry) => entry !== null && !isUsableEntry(entry));

		expect(greyed("dardan")).toStrictEqual(slotFlags([false, false, false, false, true]));
		expect(greyed("elira")).toStrictEqual(slotFlags([false, false, false, false]));

		// ... and the same rule reaches the Items menu, through the menu's own flags.
		expect(itemsRequest(sheet("dardan"), { x: 0, y: 0 }).disabled).toStrictEqual([false, false, false, false, true]);
		expect(itemsRequest(sheet("elira"), { x: 0, y: 0 }).disabled).toStrictEqual([false, false]);
	});

	test("Handing over the readied weapon leaves the unit unarmed", () => {
		openPacks();

		confirmSlot(TradeSide.UNIT, 0); // the equipped bronze sword
		confirmSlot(TradeSide.PARTNER, 3); // an empty slot

		expect(sheet("dardan").weapon).toBeNull();
		expect(ids("elira")).toContain("bronze-sword");
		expect(sheet("elira").weapon?.id).toBe("iron-axe"); // the receiver readies nothing by itself
	});

	test("Confirming the slot an entry came from puts it back down", () => {
		openPacks();

		confirmSlot(TradeSide.UNIT, 2);
		expect(state().heldSlot).toBe(2);

		confirmSlot(TradeSide.UNIT, 2);
		expect(state().heldSide).toBe(NOTHING_HELD);
		expect(ids("dardan")).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]);
	});

	test("Two slots of the same pack just change places", () => {
		openPacks();

		confirmSlot(TradeSide.UNIT, 1);
		confirmSlot(TradeSide.UNIT, 2);

		expect(ids("dardan")).toStrictEqual(["bronze-sword", "iron-blade", "iron-sword", "vulnerary"]);
		expect(state().heldSide).toBe(NOTHING_HELD);
	});

	test("Confirm on an empty slot with empty hands does nothing", () => {
		openPacks();

		confirmSlot(TradeSide.PARTNER, 4);

		expect(state()).toMatchObject({ heldSide: NOTHING_HELD, confirmed: false });
	});

	test("A full pack has no empty slot, so putting an entry down on it swaps", () => {
		const component = unit("elira").getComponent(UnitComponent);
		const elira = component.read();
		const last = INVENTORY_SIZE - 1;

		// Fill Elira's pack to its every slot, padding with copies of her concoction.
		const padding = new Array(INVENTORY_SIZE - elira.inventory.length).fill(null).map(() => ({ ...elira.inventory[2] }));
		component.update({ ...elira, inventory: [...elira.inventory, ...padding] });

		openPacks();

		confirmSlot(TradeSide.UNIT, last); // Dardan's own empty slot has nothing to pick up
		expect(state().heldSide).toBe(NOTHING_HELD);

		confirmSlot(TradeSide.UNIT, 3); // the vulnerary, in hand
		confirmSlot(TradeSide.PARTNER, last); // Elira's last slot is taken, so this is a swap

		expect(ids("dardan")).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "concoction"]);
		expect(sheet("elira").inventory).toHaveLength(INVENTORY_SIZE);
	});

	test("Cancel drops a held entry, then steps the open packs back to picking a partner", () => {
		openPacks();

		confirmSlot(TradeSide.UNIT, 1);
		expect(state().heldSlot).toBe(1);

		cancel(); // only lets go of the entry
		expect(state()).toMatchObject({ phase: "trade", heldSide: NOTHING_HELD });
		expect(stateManager.peek()).toBeInstanceOf(TradeState);

		cancel(); // now back to the partner step
		expect(state().phase).toBe("partner");
		expect(stateManager.peek()).toBeInstanceOf(TradeState);
	});

	test("Trading costs the unit nothing - it still has its turn afterwards", () => {
		let closed: TradeClosedEvent | null = null;
		eventSystem.subscribe("trade:closed", (event) => (closed = event));
		let acted: string | null = null;
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		openPacks();
		confirmSlot(TradeSide.UNIT, 3);
		confirmSlot(TradeSide.PARTNER, 4); // the vulnerary changes hands

		cancel(); // packs -> partner
		cancel(); // partner -> closed

		expect(closed).toMatchObject({ unitId: "dardan", partnerId: "elira" });
		expect(acted).toBeNull(); // nothing was spent
		expect(sheet("dardan").hasMoved).toBe(false);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(true);
		expect(stateManager.peek()).not.toBeInstanceOf(TradeState);
		expect(menu()?.id).toBe("unit-command"); // and he is asked what to do next
	});

	test("... so he can still Wait after trading, and that does spend him", () => {
		let acted: string | null = null;
		eventSystem.subscribe("unit:acted", (event) => (acted = event.unitId));

		openPacks();
		confirmSlot(TradeSide.UNIT, 3);
		confirmSlot(TradeSide.PARTNER, 4);
		cancel();
		cancel();

		eventSystem.dispatch("ui:menuConfirmed", { menu: "unit-command", row: UnitMenuRow.WAIT, index: 2, item: i18n("menu.wait") });
		eventSystem.processQueue();
		eventSystem.processQueue();

		expect(acted).toBe("dardan");
		expect(sheet("dardan").hasMoved).toBe(true);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(false);
	});

	test("Backing out empty-handed leaves the unit mid-turn with its command menu back", () => {
		chooseTrade();

		cancel();

		expect(sheet("dardan").hasMoved).toBe(false);
		expect(unit("dardan").hasComponent(PendingMoveComponent)).toBe(true);
		expect(menu()?.id).toBe("unit-command");
	});
});
