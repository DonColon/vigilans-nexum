import { test, expect, suite, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { PrepareComponent, PrepareMode } from "@/game/prepare/components/PrepareComponent";
import { canDeployMore, deployed, deploymentLimits, freeSlots, playerUnitAt } from "@/game/prepare/rules/Preparation";
import { convoySlots, exchangeWithConvoy, reorderConvoy } from "@/game/prepare/rules/Exchange";
import { ExchangeComponent, ExchangeSide, NOTHING_HELD } from "@/game/prepare/components/ExchangeComponent";
import {
	ARMY_MENU,
	armyBox,
	armyColumns,
	armyMenuRequest,
	EQUIP_MENU,
	equipMenuRequest,
	otherBox,
	PACK_MENU,
	packBox,
	packMenuPosition,
	packMenuRequest,
	panelRows,
	pickRosterRequest,
	prepareMenuPosition,
	PREPARE_MENU_WIDTH,
	scrolledFrom,
	USE_MENU,
	useMenuRequest
} from "@/game/prepare/view/PrepareMenus";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { i18n } from "@/core/i18n/I18n";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { deploymentAsset, DeploymentDocument, parseDeployment, placementId } from "@/game/units/content/Deployments";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import { GameError } from "@/core/GameError";
import bellumDocument from "@/assets/data/deployments/bellum.deployment.json";
import dardanDocument from "@/assets/data/units/dardan-niveli.unit.json";
import hasanDocument from "@/assets/data/units/hasan-eyletmez.unit.json";
import leonaDocument from "@/assets/data/units/leona-kaori.unit.json";
import banditDocument from "@/assets/data/units/bandit.unit.json";

/** What the preparations may change, read off a deployment sheet and the units on the map - all pure. */
suite("Prepare Test Suite", () => {
	const world = ServiceRegistry.get<World>(World.name);
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	world.registerComponent(UnitComponent);
	world.registerComponent(GridPositionComponent);

	const spawned: Entity[] = [];

	const spawn = (document: unknown, column: number, row: number, overrides: Partial<UnitData> = {}) => {
		const entity = world.createEntity();
		entity.addComponent(UnitComponent, { ...buildUnit(document as UnitDocument), ...overrides } as UnitData);
		entity.addComponent(GridPositionComponent, { column, row });
		spawned.push(entity);
		return entity;
	};

	const bellum = parseDeployment(bellumDocument);

	afterEach(() => {
		while (spawned.length > 0) {
			world.unregisterEntity(spawned.pop() as Entity);
		}
	});

	suite("The deployment sheet", () => {
		test("A placement goes by its own id when it has one, so one sheet can stand on the map several times", () => {
			expect(placementId({ unit: "bandit", column: 0, row: 0 })).toBe("bandit");
			expect(placementId({ unit: "bandit", id: "bandit-2", column: 0, row: 0 })).toBe("bandit-2");
			expect(bellum.units.filter((placement) => placement.unit === "bandit").map(placementId)).toStrictEqual(["bandit-1", "bandit-2"]);
		});

		test("Two placements with the same id, a bad capacity or a bad slot are rejected", () => {
			const twice = { ...bellum, units: [...bellum.units, { unit: "bandit", id: "bandit-1", column: 1, row: 1 }] };
			expect(() => parseDeployment(twice)).toThrow(/twice/);
			expect(() => parseDeployment({ ...bellum, capacity: 0 })).toThrow(GameError);
			expect(() => parseDeployment({ ...bellum, slots: [{ column: "a", row: 1 }] })).toThrow(/slot/);
			expect(() => parseDeployment({ ...bellum, units: [{ unit: "bandit", id: "", column: 1, row: 1 }] })).toThrow(/id/);
		});

		test("The limits are the player placements' tiles plus the sheet's slots, its capacity, and the required units", () => {
			const limits = deploymentLimits(bellum, assets);

			expect(limits.slots).toStrictEqual([
				{ column: 4, row: 10 },
				{ column: 5, row: 10 },
				{ column: 5, row: 11 },
				{ column: 3, row: 11 }
			]);
			expect(limits.capacity).toBe(4);
			expect(limits.required).toStrictEqual(["dardan-niveli", "hasan-eyletmez"]);
		});

		test("A capacity beyond the deploy tiles is cut to them, and a sheet without one takes every tile", () => {
			expect(deploymentLimits({ ...bellum, capacity: 40 }, assets).capacity).toBe(4);
			expect(deploymentLimits({ ...bellum, capacity: undefined }, assets).capacity).toBe(4);
			expect(deploymentLimits({ ...bellum, slots: undefined, capacity: undefined }, assets).capacity).toBe(2);
		});

		test("Every shipped deployment parses, with every placement's sheet in the bundle and instance ids unique", () => {
			for (const scenario of ["skirmish", "bellum", "river"]) {
				const deployment = parseDeployment(assets.getJson<DeploymentDocument>(deploymentAsset(scenario)));

				for (const placement of deployment.units) {
					expect(() => assets.getJson(`unit-${placement.unit}`), `${scenario} places "${placement.unit}"`).not.toThrow();
				}
			}
		});
	});

	suite("The record", () => {
		const record = PrepareComponent.open(
			3,
			[
				{ column: 1, row: 1 },
				{ column: 2, row: 1 },
				{ column: 3, row: 1 }
			],
			["dardan-niveli"]
		);

		test("A fresh record holds the turn, knows its tiles, and keeps the required units on the map", () => {
			expect(record).toMatchObject({ mode: PrepareMode.MENU, capacity: 3, holding: true, picked: "" });
			expect(PrepareComponent.isSlot(record, { column: 2, row: 1 })).toBe(true);
			expect(PrepareComponent.isSlot(record, { column: 2, row: 2 })).toBe(false);
			expect(PrepareComponent.canBench(record, "dardan-niveli")).toBe(false);
			expect(PrepareComponent.canBench(record, "hasan-eyletmez")).toBe(true);
		});

		test("Changing mode drops whatever was picked up; finishing releases the turn", () => {
			const picked = { ...record, picked: "hasan-eyletmez", confirmed: true };

			expect(PrepareComponent.inMode(picked, PrepareMode.FORMATION)).toMatchObject({ mode: PrepareMode.FORMATION, picked: "", confirmed: false });
			expect(PrepareComponent.finished(PrepareComponent.holdingTurn(picked, 1, "player"))).toMatchObject({
				mode: PrepareMode.DONE,
				holding: false,
				turnNumber: 1,
				turnPhase: "player",
				picked: ""
			});
		});
	});

	suite("The units on the map", () => {
		const record = PrepareComponent.open(
			2,
			[
				{ column: 1, row: 1 },
				{ column: 2, row: 1 },
				{ column: 3, row: 1 }
			],
			[]
		);

		test("Free tiles are the deploy tiles nobody stands on, and the player's units are the deployed", () => {
			const dardan = spawn(dardanDocument, 1, 1);
			const bandit = spawn(banditDocument, 2, 1);
			const units = [dardan, bandit];

			expect(deployed(units)).toStrictEqual([dardan]);
			expect(freeSlots(record, units)).toStrictEqual([{ column: 3, row: 1 }]);
			expect(playerUnitAt(units, { column: 1, row: 1 })).toBe(dardan);
			expect(playerUnitAt(units, { column: 2, row: 1 })).toBeNull();
			expect(playerUnitAt(units, { column: 3, row: 1 })).toBeNull();
		});

		test("One more may be deployed under the capacity with a tile free, and not otherwise", () => {
			const dardan = spawn(dardanDocument, 1, 1);
			expect(canDeployMore(record, [dardan])).toBe(true);

			const hasan = spawn(hasanDocument, 2, 1);
			expect(canDeployMore(record, [dardan, hasan])).toBe(false); // at the capacity of 2

			const roomy = { ...record, capacity: 5 };
			expect(canDeployMore(roomy, [dardan, hasan])).toBe(true);

			const leona = spawn(leonaDocument, 3, 1);
			expect(canDeployMore(roomy, [dardan, hasan, leona])).toBe(false); // no tile left
		});
	});

	suite("The menus", () => {
		const viewport = { width: 1536, height: 768 };

		test("The preparations menu sits dead centre", () => {
			const { x, y } = prepareMenuPosition(viewport);

			expect(x + PREPARE_MENU_WIDTH / 2).toBe(viewport.width / 2);
			expect(y).toBeGreaterThan(viewport.height / 4);
			expect(y).toBeLessThan(viewport.height / 2);
		});

		test("The deploy list is a selectable roster naming every unit, marking the required and the benched, carrying the benched sheets and counting the deployed", () => {
			const dardan = buildUnit(dardanDocument as UnitDocument);
			const leona = buildUnit(leonaDocument as UnitDocument);
			const request = pickRosterRequest(
				[
					{ unit: dardan, onMap: true, required: true },
					{ unit: leona, onMap: false, required: false }
				],
				1,
				4,
				1
			);

			expect(request).toMatchObject({
				unitIds: ["dardan-niveli", "leona-kaori"],
				disabled: [true, false],
				selectable: true,
				selectedIndex: 1,
				status: [i18n("prepare.required"), i18n("prepare.bench")]
			});
			expect(request.sheets?.map((sheet) => sheet.id)).toStrictEqual(["leona-kaori"]);
			expect(request.title).toContain("1/4");
		});

		test("The items screen is three panels: the army list across the top third, the pack under it on the left, the rest on the right", () => {
			const army = armyBox(viewport);
			const pack = packBox(viewport);
			const other = otherBox(viewport);

			expect(army.getPosition().y).toBeLessThan(viewport.height / 8);
			expect(army.getWidth()).toBeGreaterThan(viewport.width * 0.9);
			expect(army.getPosition().y + army.getHeight()).toBeLessThanOrEqual(viewport.height / 3);

			expect(pack.getPosition().y).toBeGreaterThanOrEqual(viewport.height / 3);
			expect(pack.getPosition().x + pack.getWidth()).toBeLessThanOrEqual(viewport.width / 2);
			expect(pack.getPosition().y + pack.getHeight()).toBeLessThan(viewport.height);
			expect(pack.getPosition().y + pack.getHeight()).toBeGreaterThan(viewport.height * 0.9);

			expect(other.getPosition().x).toBeGreaterThanOrEqual(viewport.width / 2);
			expect(other.getPosition().y).toBe(pack.getPosition().y);
			expect(other.getWidth()).toBe(pack.getWidth());
			expect(other.getHeight()).toBe(pack.getHeight());
			expect(packMenuPosition(viewport)).toStrictEqual({ x: other.getPosition().x, y: other.getPosition().y });

			// A pack's eight slots fit; a wide screen gets several columns of units, a narrow one fewer.
			expect(panelRows(pack)).toBeGreaterThanOrEqual(8);
			expect(armyColumns(viewport)).toBeGreaterThanOrEqual(3);
			expect(armyColumns({ width: 640, height: 480 })).toBe(1);
		});

		test("A list longer than its panel scrolls with the cursor and never past its end", () => {
			expect(scrolledFrom(5, 4, 8)).toBe(0);
			expect(scrolledFrom(12, 0, 8)).toBe(0);
			expect(scrolledFrom(12, 7, 8)).toBe(0);
			expect(scrolledFrom(12, 8, 8)).toBe(1);
			expect(scrolledFrom(12, 11, 8)).toBe(4);
			expect(scrolledFrom(12, -1, 8)).toBe(0);
		});

		test("The army list fills its panel in columns, and asks for a partner while a unit is trading", () => {
			const dardan = buildUnit(dardanDocument as UnitDocument);
			const entries = [
				{ unit: dardan, onMap: true },
				{ unit: buildUnit(leonaDocument as UnitDocument), onMap: false }
			];
			const request = armyMenuRequest(entries, viewport, 1);
			const box = armyBox(viewport);

			expect(request).toMatchObject({
				id: ARMY_MENU,
				ids: ["dardan-niveli", "leona-kaori"],
				values: ["", i18n("prepare.bench")],
				keepOpen: true,
				selectedIndex: 1,
				title: i18n("prepare.items")
			});
			expect(request.position).toStrictEqual({ x: box.getPosition().x, y: box.getPosition().y });
			expect(request.width).toBe(box.getWidth());
			expect(request.height).toBe(box.getHeight());
			expect(request.columns).toBe(armyColumns(viewport));

			expect(armyMenuRequest(entries, viewport, 0, true).title).toBe(i18n("prepare.partner"));
		});

		test("The pack menu offers the convoy, a trade, equipping and using - greyed when the unit has nothing for them", () => {
			const dardan = buildUnit(dardanDocument as UnitDocument);
			const request = packMenuRequest(dardan, 2, 3, viewport, 1);

			expect(request).toMatchObject({ id: PACK_MENU, ids: ["convoy", "trade", "equip", "use"], selectedIndex: 1, position: packMenuPosition(viewport) });
			expect(request.items[0]).toContain("3");
			// A rested unit has nothing to heal; the sword can be readied.
			expect(request.disabled).toStrictEqual([false, false, false, true]);

			const wounded = { ...dardan, currentHP: 1 };
			expect(packMenuRequest(wounded, 0, 0, viewport).disabled).toStrictEqual([false, true, false, false]);

			const unarmed = { ...dardan, inventory: [], weapon: null };
			expect(packMenuRequest(unarmed, 1, 0, viewport).disabled).toStrictEqual([false, false, true, true]);
		});

		test("Equip and Use put the pack up in its panel's place, greying what the row cannot take", () => {
			const dardan = { ...buildUnit(dardanDocument as UnitDocument), currentHP: 1 };
			const box = packBox(viewport);

			const equip = equipMenuRequest(dardan, viewport);
			expect(equip).toMatchObject({ id: EQUIP_MENU, ids: ["bronze-sword", "vulnerary"], badges: ["E", ""], disabled: [false, true], width: box.getWidth(), height: box.getHeight() });
			expect(equip.position).toStrictEqual({ x: box.getPosition().x, y: box.getPosition().y });

			const use = useMenuRequest(dardan, viewport, 1);
			expect(use).toMatchObject({ id: USE_MENU, ids: ["bronze-sword", "vulnerary"], disabled: [true, false], selectedIndex: 1 });
		});
	});

	suite("The exchange with the convoy", () => {
		const dardan = buildUnit(dardanDocument as UnitDocument);
		const convoy = ConvoyComponent.store(ConvoyComponent.store({ items: [] }, buildUnit(hasanDocument as UnitDocument).inventory[0]), dardan.inventory[1]);

		test("The convoy's rows are its entries and one empty row after them", () => {
			expect(convoySlots(convoy).map((entry) => entry?.id ?? null)).toStrictEqual(["bronze-axe", "vulnerary", null]);
			expect(convoySlots({ items: [] })).toStrictEqual([null]);
		});

		test("A pack entry on the empty row is sent to the convoy, and leaves the unit unarmed if it was readied", () => {
			const { unit, convoy: after } = exchangeWithConvoy(dardan, 0, convoy, 2);

			expect(unit.inventory.map((entry) => entry.id)).toStrictEqual(["vulnerary"]);
			expect(unit.weapon).toBeNull();
			expect(after.items.map((entry) => entry.id)).toStrictEqual(["bronze-axe", "vulnerary", "bronze-sword"]);
			expect(after.items[2].equipped).toBe(false);
		});

		test("A convoy entry on an empty slot is taken into the back of the pack - wieldable only if the class trains in it", () => {
			const swordsman = { ...dardan, weaponTypes: ["sword" as const] };
			const { unit, convoy: after } = exchangeWithConvoy(swordsman, 5, convoy, 0);

			expect(unit.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "vulnerary", "bronze-axe"]);
			expect(unit.inventory[2]).toMatchObject({ equipped: false, equippable: false });
			expect(after.items.map((entry) => entry.id)).toStrictEqual(["vulnerary"]);
		});

		test("An entry on both sides swaps places", () => {
			const { unit, convoy: after } = exchangeWithConvoy(dardan, 1, convoy, 0);

			expect(unit.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "bronze-axe"]);
			expect(after.items.map((entry) => entry.id)).toStrictEqual(["vulnerary", "vulnerary"]);
		});

		test("Nothing changes hands between two empty rows, outside either side, or into a full pack", () => {
			const full = { ...dardan, inventory: new Array(8).fill(dardan.inventory[1]) };

			expect(exchangeWithConvoy(dardan, 4, convoy, 2)).toStrictEqual({ unit: dardan, convoy });
			expect(exchangeWithConvoy(dardan, 8, convoy, 0)).toStrictEqual({ unit: dardan, convoy });
			expect(exchangeWithConvoy(dardan, 0, convoy, 3)).toStrictEqual({ unit: dardan, convoy });
			expect(exchangeWithConvoy(full, 8, convoy, 0)).toStrictEqual({ unit: full, convoy });
		});

		test("The convoy can be tidied, two entries at a time", () => {
			expect(reorderConvoy(convoy, 0, 1).items.map((entry) => entry.id)).toStrictEqual(["vulnerary", "bronze-axe"]);
			expect(reorderConvoy(convoy, 0, 2)).toBe(convoy);
			expect(reorderConvoy(convoy, 1, 1)).toBe(convoy);
		});

		test("A fresh exchange starts on the pack with nothing in hand, and knows which side it faces", () => {
			const withConvoy = ExchangeComponent.open("dardan-niveli", "");
			const withUnit = ExchangeComponent.open("dardan-niveli", "hasan-eyletmez");

			expect(withConvoy).toMatchObject({ side: ExchangeSide.PACK, packSlot: 0, otherSlot: 0, heldSide: NOTHING_HELD });
			expect(ExchangeComponent.withConvoy(withConvoy)).toBe(true);
			expect(ExchangeComponent.withConvoy(withUnit)).toBe(false);
			expect(ExchangeComponent.isHolding(withConvoy)).toBe(false);

			const onOther = { ...withConvoy, side: ExchangeSide.OTHER, otherSlot: 3 };
			expect(ExchangeComponent.cursorSlot(onOther)).toBe(3);
			expect(ExchangeComponent.withCursorSlot(onOther, 5)).toMatchObject({ otherSlot: 5, packSlot: 0 });
			expect(ExchangeComponent.dropped({ ...onOther, heldSide: ExchangeSide.PACK, heldSlot: 2, confirmed: true })).toMatchObject({
				heldSide: NOTHING_HELD,
				heldSlot: NOTHING_HELD,
				confirmed: false
			});
		});
	});

	suite("The roster across a chapter", () => {
		const dardan = buildUnit(dardanDocument as UnitDocument);
		const hasan = buildUnit(hasanDocument as UnitDocument);
		const leona = buildUnit(leonaDocument as UnitDocument);

		test("Deployed units are enrolled once; a benched unit takes its sheet with it", () => {
			const begun = CampaignComponent.begin(1, "bellum");
			const enrolled = CampaignComponent.enrolled(begun, [dardan, hasan]);

			expect(enrolled.roster.map((unit) => unit.id)).toStrictEqual(["dardan-niveli", "hasan-eyletmez"]);
			expect(CampaignComponent.enrolled(enrolled, [dardan])).toBe(enrolled);

			const benched = CampaignComponent.withRosterEntry(enrolled, { ...hasan, level: 3 });
			expect(CampaignComponent.veteran(benched, "hasan-eyletmez")?.level).toBe(3);
			expect(CampaignComponent.benched(benched, ["dardan-niveli"]).map((unit) => unit.id)).toStrictEqual(["hasan-eyletmez"]);
			expect(CampaignComponent.withRosterEntry(enrolled, leona).roster).toHaveLength(3);
		});

		test("Winning keeps the benched on the roster and drops the casualties", () => {
			const before = CampaignComponent.withCasualty(CampaignComponent.enrolled(CampaignComponent.begin(1, "bellum"), [dardan, hasan, leona]), "leona-kaori");
			const after = CampaignComponent.cleared(before, [{ ...dardan, level: 4 }], [], "river");

			expect(after.roster.map((unit) => `${unit.id} L${unit.level}`)).toStrictEqual(["dardan-niveli L4", "hasan-eyletmez L1"]);
			expect(after.fallen).toStrictEqual(["leona-kaori"]);
		});
	});
});
