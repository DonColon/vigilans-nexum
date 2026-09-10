import { test, expect, suite } from "vitest";
import {
	dropInventoryItem,
	equipInventoryItem,
	healingAmount,
	isHealingItem,
	isUsableEntry,
	swapInventorySlots,
	tradeInventoryItems,
	unequipInventoryItem,
	useHealingItem
} from "@/game/units/model/Inventory";
import { buildUnit, getItem, UnitData, UnitDocument } from "@/game/units/model/UnitData";
import dardanDocument from "@/assets/data/units/dardan.unit.json";
import eliraDocument from "@/assets/data/units/elira.unit.json";

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

/** Handing pack entries across between two units, and tidying one pack's own slots. */
suite("Inventory Trade Test Suite", () => {
	const dardan = () => buildUnit(dardanDocument as UnitDocument); // swordsman: bronze-sword, iron-sword, iron-blade, vulnerary
	const elira = () => buildUnit(eliraDocument as UnitDocument); // axe fighter: iron-axe, bronze-axe, concoction
	const ids = (unit: UnitData) => unit.inventory.map((entry) => entry.id);

	test("Two carried entries change owners", () => {
		const after = tradeInventoryItems(dardan(), 1, elira(), 2); // iron-sword <-> concoction

		expect(ids(after.left)).toStrictEqual(["bronze-sword", "concoction", "iron-blade", "vulnerary"]);
		expect(ids(after.right)).toStrictEqual(["iron-axe", "bronze-axe", "iron-sword"]);
	});

	test("An entry moved onto an empty slot is given away into the back of the pack", () => {
		const after = tradeInventoryItems(dardan(), 3, elira(), 4); // vulnerary onto a free slot

		expect(ids(after.left)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade"]);
		expect(ids(after.right)).toStrictEqual(["iron-axe", "bronze-axe", "concoction", "vulnerary"]);
	});

	test("It works the other way round too", () => {
		const after = tradeInventoryItems(dardan(), 4, elira(), 1); // bronze-axe onto Dardan's free slot

		expect(ids(after.left)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary", "bronze-axe"]);
		expect(ids(after.right)).toStrictEqual(["iron-axe", "concoction"]);
	});

	test("An entry is of use only when the holder can wield it - a consumable always is", () => {
		expect(isUsableEntry(dardan().inventory[0])).toBe(true); // his own bronze sword
		expect(isUsableEntry(dardan().inventory[3])).toBe(true); // a vulnerary is nobody's weapon
		expect(isUsableEntry(elira().inventory[0])).toBe(true); // her own iron axe

		// The axe once it has crossed to the swordsman - dead weight, and greyed out.
		const traded = tradeInventoryItems(dardan(), 4, elira(), 1);
		expect(isUsableEntry(traded.left.inventory[4])).toBe(false);
	});

	test("A weapon arrives wieldable only when the new holder's class trains in it", () => {
		const after = tradeInventoryItems(dardan(), 4, elira(), 1); // an axe, to a swordsman

		const axe = after.left.inventory[4];
		expect(axe.id).toBe("bronze-axe");
		expect(axe.equippable).toBe(false);
		expect(axe.equipped).toBe(false);

		// ... and the same axe was wieldable in the axe fighter's own pack.
		expect(elira().inventory[1].equippable).toBe(true);
	});

	test("Handing over the readied weapon leaves the unit unarmed", () => {
		const after = tradeInventoryItems(dardan(), 0, elira(), 2); // the equipped bronze-sword

		expect(after.left.weapon).toBeNull();
		expect(after.left.inventory.some((entry) => entry.equipped)).toBe(false);

		// It arrives as a plain carried entry - the receiver readies nothing by itself.
		expect(after.right.inventory[2].id).toBe("bronze-sword");
		expect(after.right.inventory[2].equipped).toBe(false);
		expect(after.right.weapon?.id).toBe("iron-axe");
	});

	test("Both units come back untouched when nothing can change hands", () => {
		const left = dardan();
		const right = elira();

		expect(tradeInventoryItems(left, 4, right, 4)).toStrictEqual({ left, right }); // two empty slots
		expect(tradeInventoryItems(left, 5, right, 0)).toStrictEqual({ left, right }); // outside the pack
		expect(tradeInventoryItems(left, -1, right, 0)).toStrictEqual({ left, right });
		expect(tradeInventoryItems(left, 0, left, 1)).toStrictEqual({ left, right: left }); // the same unit

		// A full pack has no empty slot, so putting an entry down on one of its
		// rows is always a straight swap - it never has to grow past the five.
		const full = buildUnit({ ...(eliraDocument as UnitDocument), inventory: ["iron-axe", "bronze-axe", "concoction", "vulnerary", "elixir"] });
		const swapped = tradeInventoryItems(left, 3, full, 4);

		expect(ids(swapped.left)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "elixir"]);
		expect(ids(swapped.right)).toStrictEqual(["iron-axe", "bronze-axe", "concoction", "vulnerary", "vulnerary"]);
	});

	test("The source units are left untouched", () => {
		const left = dardan();
		const right = elira();

		tradeInventoryItems(left, 0, right, 0);

		expect(ids(left)).toStrictEqual(["bronze-sword", "iron-sword", "iron-blade", "vulnerary"]);
		expect(ids(right)).toStrictEqual(["iron-axe", "bronze-axe", "concoction"]);
		expect(left.weapon?.id).toBe("bronze-sword");
	});

	test("Two slots of one pack change places, and the readied weapon stays readied", () => {
		const after = swapInventorySlots(dardan(), 0, 2);

		expect(ids(after)).toStrictEqual(["iron-blade", "iron-sword", "bronze-sword", "vulnerary"]);
		expect(after.weapon?.id).toBe("bronze-sword");
		expect(after.inventory[2].equipped).toBe(true);
	});

	test("An entry moved onto an empty slot of its own pack goes to the back", () => {
		expect(ids(swapInventorySlots(dardan(), 1, 4))).toStrictEqual(["bronze-sword", "iron-blade", "vulnerary", "iron-sword"]);
	});

	test("A rearrangement that would change nothing is a no-op", () => {
		const unit = dardan();

		expect(swapInventorySlots(unit, 2, 2)).toBe(unit); // the same slot
		expect(swapInventorySlots(unit, 4, 4)).toBe(unit); // two empty slots
		expect(swapInventorySlots(unit, 0, 5)).toBe(unit); // outside the pack
		expect(swapInventorySlots(unit, 3, 4)).toBe(unit); // the last entry, moved to the back it is already at
	});

	test("A pack sheet cannot be authored past the five slots", () => {
		expect(() => buildUnit({ ...(dardanDocument as UnitDocument), inventory: ["bronze-sword", "iron-sword", "iron-blade", "vulnerary", "elixir", "concoction"] })).toThrow(/a pack holds 5/);
	});
});
