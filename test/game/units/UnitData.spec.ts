import { test, expect, suite } from "vitest";
import { GameError } from "@/core/GameError";
import { buildUnit, getUnitClass, getWeapon, UnitDocument, UnitFaction, WeaponType } from "@/game/units/model/UnitData";
import dardanDocument from "@/game/units/data/dardan.unit.json";
import hasanDocument from "@/game/units/data/hasan.unit.json";

suite("Unit Data Test Suite", () => {
	test("Dardan resolves to a player swordsman with a bronze sword", () => {
		const dardan = buildUnit(dardanDocument as UnitDocument);

		expect(dardan.name).toBe("Dardan Niveli");
		expect(dardan.faction).toBe(UnitFaction.PLAYER);
		expect(dardan.classLabel).toBe("Swordsman");
		expect(dardan.movement).toBe(5);
		expect(dardan.weaponTypes).toContain(WeaponType.SWORD);
		expect(dardan.weapon.name).toBe("Bronze Sword");
		expect(dardan.weapon.minRange).toBe(1);
		expect(dardan.weapon.maxRange).toBe(1);
		expect(dardan.currentHP).toBe(dardan.stats.hp);
		expect(dardan.hasMoved).toBe(false);
	});

	test("Hasan resolves to an enemy axe fighter with a bronze axe", () => {
		const hasan = buildUnit(hasanDocument as UnitDocument);

		expect(hasan.faction).toBe(UnitFaction.ENEMY);
		expect(hasan.classLabel).toBe("Axe Fighter");
		expect(hasan.weapon.type).toBe(WeaponType.AXE);
		expect(hasan.stats.strength).toBeGreaterThan(buildUnit(dardanDocument as UnitDocument).stats.strength);
	});

	test("Catalogs are looked up by id", () => {
		expect(getWeapon("bronze-axe").might).toBe(5);
		expect(getUnitClass("axe-fighter").weaponTypes).toStrictEqual([WeaponType.AXE]);

		expect(() => getWeapon("mythril-lance")).toThrowError(GameError);
		expect(() => getUnitClass("dragon")).toThrowError(GameError);
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
