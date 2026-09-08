import { test, expect, suite } from "vitest";
import { dropInventoryItem, equipInventoryItem, healingAmount, isHealingItem, unequipInventoryItem, useHealingItem } from "@/game/units/model/Inventory";
import { buildUnit, getItem, UnitDocument } from "@/game/units/model/UnitData";
import dardanDocument from "@/game/units/data/dardan.unit.json";

/** Pack edits over a resolved unit: ready a weapon, put it away, or drop an entry. */
suite("Inventory Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument);

	test("Equipping a wieldable weapon readies it and moves it to the front", () => {
		const before = dardan();
		expect(before.weapon?.id).toBe("bronze-sword");

		const after = equipInventoryItem(before, 2); // iron-blade

		expect(after.weapon?.id).toBe("iron-blade");
		expect(after.inventory.map((entry) => entry.id)).toStrictEqual(["iron-blade", "bronze-sword", "iron-sword", "vulnerary"]);
		expect(after.inventory.filter((entry) => entry.equipped).map((entry) => entry.id)).toStrictEqual(["iron-blade"]);
		expect(after.weapon).toBe(after.inventory[0].weapon);
	});

	test("The source unit is left untouched", () => {
		const before = dardan();
		equipInventoryItem(before, 1);
		unequipInventoryItem(before);
		dropInventoryItem(before, 0);

		expect(before.weapon?.id).toBe("bronze-sword");
		expect(before.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]);
	});

	test("Equipping a consumable or the already-readied weapon is a no-op", () => {
		const unit = dardan();

		expect(equipInventoryItem(unit, 0)).toBe(unit); // already readied
		expect(equipInventoryItem(unit, 3)).toBe(unit); // vulnerary
		expect(equipInventoryItem(unit, 99)).toBe(unit); // out of range
	});

	test("A weapon the class cannot wield cannot be readied", () => {
		const unit = buildUnit({ ...(dardanDocument as UnitDocument), inventory: ["bronze-sword", "iron-axe"] });

		expect(unit.inventory[1].equippable).toBe(false);
		expect(equipInventoryItem(unit, 1)).toBe(unit);
	});

	test("Unequipping clears the readied weapon and every equipped flag, keeping pack order", () => {
		const after = unequipInventoryItem(dardan());

		expect(after.weapon).toBeNull();
		expect(after.inventory.some((entry) => entry.equipped)).toBe(false);
		expect(after.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]);

		// Nothing readied - unequipping again changes nothing.
		expect(unequipInventoryItem(after)).toBe(after);
	});

	test("Dropping removes the entry; dropping the readied weapon leaves the unit unarmed", () => {
		const droppedItem = dropInventoryItem(dardan(), 3); // vulnerary
		expect(droppedItem.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade"]);
		expect(droppedItem.weapon?.id).toBe("bronze-sword");

		const droppedWeapon = dropInventoryItem(dardan(), 0); // the readied bronze-sword
		expect(droppedWeapon.weapon).toBeNull();
		expect(droppedWeapon.inventory.map((entry) => entry.id)).toStrictEqual(["iron-sword", "iron-blade", "vulnerary"]);

		const unit = dardan();
		expect(dropInventoryItem(unit, 99)).toBe(unit); // out of range is a no-op
		expect(dropInventoryItem(unit, -1)).toBe(unit);
	});
});

/** Using a vulnerary-style consumable: restore HP up to the unit's cap, spend a charge. */
suite("Healing Item Test Suite", () => {
	const wounded = (hp: number) => ({ ...buildUnit(dardanDocument as UnitDocument), currentHP: hp }); // vulnerary in slot 3, heals 10

	test("isHealingItem picks out consumables that restore HP", () => {
		const unit = buildUnit({ ...(dardanDocument as UnitDocument), inventory: ["bronze-sword", "vulnerary", "elixir"] });

		expect(isHealingItem(unit.inventory[0])).toBe(false); // the sword
		expect(isHealingItem(unit.inventory[1])).toBe(true); // vulnerary
		expect(isHealingItem(unit.inventory[2])).toBe(true); // elixir
	});

	test("healingAmount is clamped to the missing HP", () => {
		expect(healingAmount(wounded(5), getItem("vulnerary"))).toBe(10);
		expect(healingAmount(wounded(15), getItem("vulnerary"))).toBe(5); // only 5 missing
		expect(healingAmount(wounded(20), getItem("vulnerary"))).toBe(0); // full HP
		expect(healingAmount(wounded(3), getItem("elixir"))).toBe(17); // "full" heals the whole wound
	});

	test("Using a vulnerary heals up to the cap and spends one charge", () => {
		const after = useHealingItem(wounded(5), 3);

		expect(after.currentHP).toBe(15);
		expect(after.inventory[3].uses).toBe(2);
		expect(after.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]);
	});

	test("Healing never overfills", () => {
		expect(useHealingItem(wounded(18), 3).currentHP).toBe(20);
	});

	test("The last charge removes the item from the pack", () => {
		const unit = wounded(5);
		unit.inventory = unit.inventory.map((entry) => (entry.id === "vulnerary" ? { ...entry, uses: 1 } : entry));

		const after = useHealingItem(unit, 3);

		expect(after.currentHP).toBe(15);
		expect(after.inventory.map((entry) => entry.id)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade"]);
	});

	test("Using at full HP, on a weapon, or out of range is a no-op", () => {
		const full = wounded(20);
		expect(useHealingItem(full, 3)).toBe(full); // already at the cap

		const hurt = wounded(5);
		expect(useHealingItem(hurt, 0)).toBe(hurt); // slot 0 is the bronze sword
		expect(useHealingItem(hurt, 99)).toBe(hurt); // out of range
	});

	test("The source unit is left untouched", () => {
		const before = wounded(5);
		useHealingItem(before, 3);

		expect(before.currentHP).toBe(5);
		expect(before.inventory[3].uses).toBe(3);
	});
});
