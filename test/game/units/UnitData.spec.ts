import { test, expect, suite, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { GameError } from "@/core/GameError";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { clearUnitCatalogs, hasUnitCatalogs, loadUnitCatalogs } from "@/game/units/model/UnitCatalog";
import { buildUnit, getItem, getUnitClass, getWeapon, InventoryKind, UnitDocument, UnitFaction, WeaponType } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

suite("Unit Data Test Suite", () => {
	test("Dardan resolves to a player swordsman with a bronze sword", () => {
		const dardan = buildUnit(dardanDocument as UnitDocument);

		expect(dardan.name).toBe("Dardan Niveli");
		expect(dardan.faction).toBe(UnitFaction.PLAYER);
		expect(dardan.classLabel).toBe("Swordsman");
		expect(dardan.movement).toBe(5);
		expect(dardan.weaponTypes).toContain(WeaponType.SWORD);
		expect(dardan.weapon?.name).toBe("Bronze Sword");
		expect(dardan.weapon?.minRange).toBe(1);
		expect(dardan.weapon?.maxRange).toBe(1);
		expect(dardan.currentHP).toBe(dardan.stats.hp);
		expect(dardan.hasMoved).toBe(false);
		expect(dardan.commander).toBe(true);
	});

	test("Hasan resolves to an enemy axe fighter with a bronze axe", () => {
		const hasan = buildUnit(hasanDocument as UnitDocument);

		expect(hasan.faction).toBe(UnitFaction.ENEMY);
		expect(hasan.classLabel).toBe("Axe Fighter");
		expect(hasan.weapon?.type).toBe(WeaponType.AXE);
		expect(hasan.stats.strength).toBeGreaterThan(buildUnit(dardanDocument as UnitDocument).stats.strength);
		expect(hasan.commander).toBe(false);
	});

	test("Catalogs are looked up by id", () => {
		expect(getWeapon("bronze-axe").might).toBe(5);
		expect(getWeapon("iron-sword").might).toBe(5);
		expect(getItem("vulnerary").uses).toBe(3);
		expect(getItem("vulnerary").heal).toBe(10);
		expect(getItem("elixir").heal).toBe("full");
		expect(getUnitClass("axe-fighter").weaponTypes).toStrictEqual([WeaponType.AXE]);

		expect(() => getWeapon("mythril-lance")).toThrowError(GameError);
		expect(() => getItem("panacea")).toThrowError(GameError);
		expect(() => getUnitClass("dragon")).toThrowError(GameError);
	});

	test("A unit resolves its pack of weapons and items, one weapon readied", () => {
		const dardan = buildUnit(dardanDocument as UnitDocument);

		expect(dardan.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]);

		const ironSword = dardan.inventory[1];
		expect(ironSword.kind).toBe(InventoryKind.WEAPON);
		expect(ironSword.equippable).toBe(true);
		expect(ironSword.equipped).toBe(false);

		const vulnerary = dardan.inventory[3];
		expect(vulnerary.kind).toBe(InventoryKind.ITEM);
		expect(vulnerary.equippable).toBe(false);
		expect(vulnerary.item?.name).toBe("Vulnerary");

		const readied = dardan.inventory.filter((entry) => entry.equipped);
		expect(readied).toHaveLength(1);
		expect(readied[0].id).toBe("bronze-sword");
		expect(dardan.weapon).toBe(readied[0].weapon);
	});

	test("With no inventory listed the pack is just the readied weapon", () => {
		const loner = buildUnit({ ...(dardanDocument as UnitDocument), inventory: undefined });

		expect(loner.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword"]);
		expect(loner.inventory[0].equipped).toBe(true);
	});

	test("An unknown pack entry is rejected", () => {
		expect(() => buildUnit({ ...(dardanDocument as UnitDocument), inventory: ["bronze-sword", "moonstone"] })).toThrowError(GameError);
	});

	test("A unit that cannot wield its weapon is rejected", () => {
		const broken = { ...(dardanDocument as UnitDocument), weapon: "bronze-axe" };
		expect(() => buildUnit(broken)).toThrowError(GameError);
	});

	test("A malformed sheet is rejected", () => {
		expect(() => buildUnit({ ...(dardanDocument as UnitDocument), format: "something-else" } as unknown as UnitDocument)).toThrowError(GameError);
		expect(() => buildUnit({ ...(dardanDocument as UnitDocument), faction: "neutral" } as unknown as UnitDocument)).toThrowError(GameError);
		expect(() => buildUnit({ ...(dardanDocument as UnitDocument), level: 0 } as UnitDocument)).toThrowError(GameError);
	});
});

/**
 * The catalogs are content, fetched into AssetStorage rather than bundled, so a
 * lookup can be reached before they land. That is a wiring mistake, and it has
 * to say so rather than failing somewhere further down on `undefined`.
 */
suite("Unit Catalog Test Suite", () => {
	const assetStorage = ServiceRegistry.get<AssetStorage>(AssetStorage.name);

	// vitest.setup.ts seeds them for every other spec; put them back.
	afterEach(() => loadUnitCatalogs(assetStorage));

	test("A lookup before the bundle has landed names the missing catalog", () => {
		clearUnitCatalogs();
		expect(hasUnitCatalogs()).toBe(false);

		expect(() => getWeapon("bronze-sword")).toThrowError(/"weapons" catalog has not been loaded/);
		expect(() => getItem("vulnerary")).toThrowError(/"items" catalog has not been loaded/);
		expect(() => getUnitClass("swordsman")).toThrowError(/"classes" catalog has not been loaded/);
		expect(() => buildUnit(dardanDocument as UnitDocument)).toThrowError(GameError);
	});

	test("Seeding from the asset bundle makes the lookups work again", () => {
		clearUnitCatalogs();
		loadUnitCatalogs(assetStorage);

		expect(hasUnitCatalogs()).toBe(true);
		expect(getWeapon("bronze-sword").name).toBe("Bronze Sword");
		expect(getItem("vulnerary").name).toBe("Vulnerary");
		expect(getUnitClass("swordsman").name).toBe("Swordsman");
	});
});
