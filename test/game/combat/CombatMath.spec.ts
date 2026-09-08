import { test, expect, suite } from "vitest";
import { Terrain } from "@/game/map/model/Terrain";
import { buildUnit, UnitDocument, WeaponType } from "@/game/units/model/UnitData";
import { attackSpeed, avoidRate, computeStrike, critRate, damagePerHit, doublesAt, hitRate, TRIANGLE_HIT, TRIANGLE_MIGHT, weaponReaches, weaponTriangle } from "@/game/combat/model/CombatMath";
import dardanDocument from "@/game/units/data/dardan.unit.json";
import hasanDocument from "@/game/units/data/hasan.unit.json";

/**
 * The Radiant Dawn combat formulas. Numbers are worked out by hand from the two
 * shipped sheets: Dardan (swordsman, bronze sword) vs Hasan (axe fighter, bronze
 * axe) - sword beats axe, so Dardan attacks with triangle advantage.
 */
suite("Combat Math Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);
	const hasan = () => buildUnit(hasanDocument as UnitDocument);

	test("The weapon triangle: sword > axe > lance > sword, everything else neutral", () => {
		expect(weaponTriangle(WeaponType.SWORD, WeaponType.AXE)).toBe("advantage");
		expect(weaponTriangle(WeaponType.AXE, WeaponType.SWORD)).toBe("disadvantage");
		expect(weaponTriangle(WeaponType.AXE, WeaponType.LANCE)).toBe("advantage");
		expect(weaponTriangle(WeaponType.LANCE, WeaponType.SWORD)).toBe("advantage");
		expect(weaponTriangle(WeaponType.BOW, WeaponType.SWORD)).toBe("neutral");
		expect(weaponTriangle(WeaponType.SWORD, WeaponType.SWORD)).toBe("neutral");
	});

	test("Attack Speed drops by the weight the wielder's Strength cannot carry", () => {
		// Dardan: Spd 9, Bronze Sword weight 4, Str 6 -> no burden.
		expect(attackSpeed(dardan(), dardan().weapon)).toBe(9);
		// Iron Blade weighs 13, so 13 - 6 = 7 comes off.
		const blade = dardan().inventory.find((entry) => entry.id === "iron-blade")?.weapon ?? null;
		expect(attackSpeed(dardan(), blade)).toBe(2);
		// Unarmed carries nothing.
		expect(attackSpeed(dardan(), null)).toBe(9);
	});

	test("Damage, hit and crit for Dardan's advantaged sword swing", () => {
		const attacker = dardan();
		const defender = hasan();
		const weapon = attacker.weapon!;

		expect(damagePerHit(attacker, weapon, defender, Terrain.PLAIN, "advantage")).toBe(2); // (6 + 3 + 1) - 8
		expect(hitRate(attacker, weapon, "advantage")).toBe(100 + 16 + 3 + TRIANGLE_HIT);
		expect(avoidRate(defender, defender.weapon, Terrain.PLAIN)).toBe(14); // AS 5 * 2 + Luck 4
		expect(critRate(attacker, weapon)).toBe(4); // 0 + floor(8 / 2)
	});

	test("computeStrike clamps the displayed odds to 0-100 and folds the triangle in", () => {
		const strike = computeStrike({
			attacker: dardan(),
			attackerWeapon: dardan().weapon!,
			defender: hasan(),
			defenderWeapon: hasan().weapon,
			defenderTerrain: Terrain.PLAIN
		});

		expect(strike.relation).toBe("advantage");
		expect(strike.damage).toBe(2);
		expect(strike.hit).toBe(100); // 129 raw, clamped
		expect(strike.crit).toBe(0); // 4 - Luck 4
	});

	test("Hasan's counter is worse: triangle disadvantage on both Might and Hit", () => {
		const counter = computeStrike({
			attacker: hasan(),
			attackerWeapon: hasan().weapon!,
			defender: dardan(),
			defenderWeapon: dardan().weapon,
			defenderTerrain: Terrain.PLAIN
		});

		expect(counter.relation).toBe("disadvantage");
		expect(counter.damage).toBe(7); // (9 + 5 - 1) - 6
		expect(counter.hit).toBe(57); // (80 + 10 + 2 - 10) - 25
		expect(counter.crit).toBe(0);
	});

	test("Terrain defence and avoid help the unit standing on it", () => {
		const onForest = computeStrike({
			attacker: hasan(),
			attackerWeapon: hasan().weapon!,
			defender: dardan(),
			defenderWeapon: dardan().weapon,
			defenderTerrain: Terrain.FOREST // +1 Def, +20 Avoid
		});

		expect(onForest.damage).toBe(6); // one less than on plain
		expect(onForest.hit).toBe(37); // 20 less than on plain
	});

	test("A four-point Attack Speed lead lands a follow-up", () => {
		expect(doublesAt(dardan(), dardan().weapon, attackSpeed(hasan(), hasan().weapon))).toBe(true); // 9 vs 5
		expect(doublesAt(hasan(), hasan().weapon, attackSpeed(dardan(), dardan().weapon))).toBe(false); // 5 vs 9
	});

	test("weaponReaches respects the weapon's range band", () => {
		const sword = dardan().weapon!;
		expect(weaponReaches(sword, 1)).toBe(true);
		expect(weaponReaches(sword, 2)).toBe(false);
	});

	test("TRIANGLE_MIGHT is one point either way", () => {
		expect(TRIANGLE_MIGHT).toBe(1);
	});
});
