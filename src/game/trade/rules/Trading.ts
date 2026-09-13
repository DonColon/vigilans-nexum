import { InventoryEntry, UnitComponent, UnitData } from "@/game/units/components/UnitComponent";

/** `unit` with slot `index` replaced. Whatever was there has left, so a readied weapon leaves the unit unarmed. */
function replaceEntry(unit: UnitData, index: number, entry: InventoryEntry): UnitData {
	const leaving = unit.inventory[index];

	return {
		...unit,
		weapon: leaving.equipped ? null : unit.weapon,
		inventory: unit.inventory.map((current, position) => (position === index ? entry : current))
	};
}

/**
 * Hands one pack slot across to the other unit, Fire Emblem's trade: two
 * carried entries change owners, and an entry moved onto an empty slot is
 * simply given away (into the back of the receiving pack). An entry that leaves
 * a unit is no longer readied - handing over the weapon in your hand leaves you
 * unarmed - and arrives wieldable only if the new holder's class trains in it.
 *
 * Both units come back as they were when nothing can change hands: two empty
 * slots, a slot outside the pack, or the same unit on both sides. A receiving
 * pack always has room for a given-away entry - the slot it is put down on is
 * empty, which a full pack has none of.
 */
export function tradeInventoryItems(left: UnitData, leftIndex: number, right: UnitData, rightIndex: number): { left: UnitData; right: UnitData } {
	const unchanged = { left, right };

	if (left.id === right.id || !UnitComponent.isSlot(leftIndex) || !UnitComponent.isSlot(rightIndex)) {
		return unchanged;
	}

	const leftEntry = left.inventory[leftIndex] ?? null;
	const rightEntry = right.inventory[rightIndex] ?? null;

	if (leftEntry === null && rightEntry === null) {
		return unchanged;
	}

	if (leftEntry !== null && rightEntry !== null) {
		return {
			left: replaceEntry(left, leftIndex, UnitComponent.received(rightEntry, left)),
			right: replaceEntry(right, rightIndex, UnitComponent.received(leftEntry, right))
		};
	}

	if (leftEntry !== null) {
		return { left: UnitComponent.drop(left, leftIndex), right: { ...right, inventory: [...right.inventory, UnitComponent.received(leftEntry, right)] } };
	}

	return { left: { ...left, inventory: [...left.inventory, UnitComponent.received(rightEntry, left)] }, right: UnitComponent.drop(right, rightIndex) };
}
