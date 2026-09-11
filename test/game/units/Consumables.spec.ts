import { test, expect, suite } from "vitest";
import { boostGains, canUseItem, isAnyBoost, isBoostingItem, isHealingItem, keyIndex, spendInventoryUse, useBoostingItem, useInventoryItem } from "@/game/units/model/Inventory";
import { buildUnit, getItem, getWeapon, isStaff, LockKind, NO_BOOST, UnitDocument } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import teutaDocument from "@/assets/data/units/teuta.unit.json";

/**
 * The consumables beyond a vulnerary: stat boosters that raise a stat for
 * good, keys that open locks, and the staff a healer carries in the weapon
 * slot. All resolved from the catalogs and worked on as pure pack edits.
 */
suite("Consumables Test Suite", () => {
	/** Dardan with a booster in his last slot. */
	const holding = (itemId: string) => buildUnit({ ...(dardanDocument as UnitDocument), inventory: ["bronze-sword", itemId] });

	test("The catalog resolves a booster, a key and a plain healing item to one shape", () => {
		expect(getItem("energy-drop")).toMatchObject({ heal: 0, boost: { ...NO_BOOST, strength: 2 }, unlocks: "" });
		expect(getItem("door-key")).toMatchObject({ heal: 0, boost: NO_BOOST, unlocks: LockKind.DOOR });
		expect(getItem("chest-key")).toMatchObject({ heal: 0, boost: NO_BOOST, unlocks: LockKind.CHEST });
		expect(getItem("vulnerary")).toMatchObject({ heal: 10, boost: NO_BOOST, unlocks: "" });
	});

	test("A booster is a booster, not a healing item - and a key is neither", () => {
		const drop = holding("energy-drop").inventory[1];
		const key = holding("door-key").inventory[1];

		expect(isBoostingItem(drop)).toBe(true);
		expect(isHealingItem(drop)).toBe(false);
		expect(isBoostingItem(key)).toBe(false);
		expect(isHealingItem(key)).toBe(false);
		expect(isAnyBoost(NO_BOOST)).toBe(false);
	});

	test("Using a booster raises the stat for good and spends the item", () => {
		const before = holding("speedwing");
		const after = useBoostingItem(before, 1);

		expect(after.stats.speed).toBe(before.stats.speed + 2);
		expect(after.stats.strength).toBe(before.stats.strength);
		// A one-use item is gone from the pack once used.
		expect(after.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword"]);
		// The source is left untouched.
		expect(before.stats.speed).toBe(9);
		expect(before.inventory.length).toBe(2);
	});

	test("The gains stop at the sheet's caps, and Use is not offered once there is nothing left to gain", () => {
		const capped = holding("dracoshield");
		capped.stats = { ...capped.stats, defense: capped.maxStats.defense - 1 };

		const gains = boostGains(capped, capped.inventory[1].item!);
		expect(gains.defense).toBe(1); // 2 on offer, 1 of headroom

		const atCap = { ...capped, stats: { ...capped.stats, defense: capped.maxStats.defense } };
		expect(boostGains(atCap, atCap.inventory[1].item!)).toStrictEqual(NO_BOOST);
		expect(canUseItem(atCap, atCap.inventory[1])).toBe(false);
		expect(useBoostingItem(atCap, 1)).toBe(atCap);
	});

	test("A raised HP maximum lifts the current HP with it", () => {
		const unit = holding("energy-drop");
		unit.inventory[1] = { ...unit.inventory[1], item: { ...unit.inventory[1].item!, boost: { ...NO_BOOST, hp: 7 } } };
		unit.currentHP = 12;

		const after = useInventoryItem(unit, 1);

		expect(after.stats.hp).toBe(27);
		expect(after.currentHP).toBe(19);
	});

	test("Use picks the right effect for the slot - a heal, a boost, or nothing for a key", () => {
		const wounded = { ...holding("vulnerary"), currentHP: 5 };
		expect(useInventoryItem(wounded, 1).currentHP).toBe(15);
		expect(canUseItem(wounded, wounded.inventory[1])).toBe(true);

		const drop = holding("energy-drop");
		expect(useInventoryItem(drop, 1).stats.strength).toBe(drop.stats.strength + 2);

		const key = holding("door-key");
		expect(canUseItem(key, key.inventory[1])).toBe(false);
		expect(useInventoryItem(key, 1)).toBe(key);
		expect(useInventoryItem(key, 0)).toBe(key); // a sword is swung, not used
	});

	test("A key is found by what it opens, and spent a charge at a time", () => {
		const teuta = buildUnit(teutaDocument as UnitDocument); // heal, door-key, chest-key

		expect(keyIndex(teuta, LockKind.DOOR)).toBe(1);
		expect(keyIndex(teuta, LockKind.CHEST)).toBe(2);
		expect(keyIndex(holding("vulnerary"), LockKind.DOOR)).toBe(-1);

		// A one-use key is gone after the door; the chest key is still there.
		const after = spendInventoryUse(teuta, 1);
		expect(after.inventory.map((entry) => entry.id)).toStrictEqual(["heal", "chest-key"]);
		expect(keyIndex(after, LockKind.DOOR)).toBe(-1);
		expect(spendInventoryUse(teuta, 99)).toBe(teuta);
	});

	test("A staff is a weapon the cleric readies, and it is the one weapon type that never strikes", () => {
		const teuta = buildUnit(teutaDocument as UnitDocument);

		expect(teuta.weapon?.id).toBe("heal");
		expect(teuta.inventory[0]).toMatchObject({ kind: "weapon", equippable: true, equipped: true });
		expect(isStaff(getWeapon("heal"))).toBe(true);
		expect(isStaff(getWeapon("mend"))).toBe(true);
		expect(isStaff(getWeapon("iron-sword"))).toBe(false);
		// A staff handed to a swordsman is dead weight, like any weapon his class does not train in.
		expect(holding("heal").inventory[1].equippable).toBe(false);
	});
});
