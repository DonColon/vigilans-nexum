import { test, expect, suite } from "vitest";
import { Terrain } from "@/game/map/model/Terrain";
import { buildUnit, UnitDocument } from "@/game/units/model/UnitData";
import { unequipInventoryItem } from "@/game/units/model/Inventory";
import { buildForecast, CombatRolls, resolveCombat } from "@/game/combat/model/BattleForecast";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import hasanDocument from "@/assets/data/units/hasan.unit.json";

suite("Battle Forecast Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);
	const hasan = () => buildUnit(hasanDocument as UnitDocument);

	const meleeForecast = (distance = 1) =>
		buildForecast({
			attacker: dardan(),
			attackerWeapon: dardan().weapon!,
			attackerTerrain: Terrain.PLAIN,
			defender: hasan(),
			defenderTerrain: Terrain.PLAIN,
			distance
		});

	test("Dardan doubles Hasan, who counters once", () => {
		const forecast = meleeForecast();

		expect(forecast.attacker).toMatchObject({ name: "Dardan Niveli", weaponName: "Bronze Sword", hp: 20, damage: 2, hit: 100, crit: 0, attacks: 2 });
		expect(forecast.defender).toMatchObject({ name: "Hasan Eyletmez", weaponName: "Bronze Axe", hp: 26, damage: 7, hit: 57, crit: 0, attacks: 1 });
		expect(forecast.distance).toBe(1);
	});

	test("Out of counter range, the defender shows nothing", () => {
		const forecast = meleeForecast(3);

		expect(forecast.attacker.attacks).toBe(2);
		expect(forecast.defender).toMatchObject({ weaponName: "", damage: 0, hit: 0, crit: 0, attacks: 0 });
	});

	test("An unarmed defender cannot counter and gives no triangle", () => {
		const forecast = buildForecast({
			attacker: hasan(),
			attackerWeapon: hasan().weapon!,
			attackerTerrain: Terrain.PLAIN,
			defender: unequipInventoryItem(dardan()),
			defenderTerrain: Terrain.PLAIN,
			distance: 1
		});

		// No sword to be disadvantaged against, so full Might: (9 + 5) - 6.
		expect(forecast.attacker.damage).toBe(8);
		expect(forecast.defender.attacks).toBe(0);
	});

	const always: CombatRolls = { hit: () => true, crit: () => false };
	const never: CombatRolls = { hit: () => false, crit: () => false };
	const crits: CombatRolls = { hit: () => true, crit: () => true };

	test("resolveCombat plays attacker, counter, follow-up in order", () => {
		const outcome = resolveCombat(meleeForecast(), always);

		expect(outcome.strikes.map((strike) => strike.side)).toStrictEqual(["attacker", "defender", "attacker"]);
		expect(outcome.defenderHp).toBe(22); // 26 - 2 - 2
		expect(outcome.attackerHp).toBe(13); // 20 - 7
		expect(outcome.attackerSwings).toBe(2);
		expect(outcome.defenderSwings).toBe(1);
		expect(outcome.attackerDefeated).toBe(false);
		expect(outcome.defenderDefeated).toBe(false);
	});

	test("A lethal counter ends the fight before the follow-up", () => {
		const outcome = resolveCombat(meleeForecast(), crits);

		// Dardan's crit puts Hasan to 26 - 6 = 20, then Hasan's crit for 21 drops Dardan.
		expect(outcome.strikes).toHaveLength(2);
		expect(outcome.attackerHp).toBe(0);
		expect(outcome.attackerDefeated).toBe(true);
		expect(outcome.attackerSwings).toBe(1); // never got the second swing
	});

	test("Missed swings still spend a weapon use", () => {
		const outcome = resolveCombat(meleeForecast(), never);

		expect(outcome.strikes.every((strike) => !strike.connected)).toBe(true);
		expect(outcome.attackerHp).toBe(20);
		expect(outcome.defenderHp).toBe(26);
		expect(outcome.attackerSwings).toBe(2);
		expect(outcome.defenderSwings).toBe(1);
	});
});
