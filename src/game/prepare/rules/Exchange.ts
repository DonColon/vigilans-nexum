import { ConvoyComponent, ConvoyData } from "@/game/convoy/components/ConvoyComponent";
import { InventoryEntry, UnitComponent, UnitData } from "@/game/units/components/UnitComponent";

/*
 * What changes hands between a unit's pack and the convoy on the preparations
 * screen. Pure, like the trade rules that do the same between two units: the
 * exchange system decides which two slots, these say what comes of it.
 */

/**
 * The rows of the convoy's side of the exchange: every entry it holds, then
 * one empty row - the place something is put down to send it to the convoy.
 * The convoy has no ceiling, so there is always exactly one.
 */
export function convoySlots(convoy: ConvoyData): (InventoryEntry | null)[] {
	return [...convoy.items, null];
}

/** Whether `index` is a row of the convoy's side - an entry or the empty row after them. */
export function isConvoySlot(convoy: ConvoyData, index: number): boolean {
	return Number.isInteger(index) && index >= 0 && index <= convoy.items.length;
}

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
 * Moves one thing between a pack slot and a convoy row: an entry on both
 * sides swaps places, a pack entry put on the empty row is sent to the convoy
 * and a convoy entry put on an empty slot is taken into the pack - into the
 * back of it, as long as there is room. What leaves the pack is no longer
 * readied and what arrives is wieldable only if the unit's class trains in it.
 *
 * Both come back as they were when nothing can change hands: two empty
 * rows, a row outside either side, or a full pack asked to take something.
 */
export function exchangeWithConvoy(unit: UnitData, unitIndex: number, convoy: ConvoyData, convoyIndex: number): { unit: UnitData; convoy: ConvoyData } {
	const unchanged = { unit, convoy };

	if (!UnitComponent.isSlot(unitIndex) || !isConvoySlot(convoy, convoyIndex)) {
		return unchanged;
	}

	const packEntry = unit.inventory[unitIndex] ?? null;
	const convoyEntry = convoy.items[convoyIndex] ?? null;

	if (packEntry === null && convoyEntry === null) {
		return unchanged;
	}

	if (packEntry !== null && convoyEntry !== null) {
		return {
			unit: replaceEntry(unit, unitIndex, UnitComponent.received(convoyEntry, unit)),
			convoy: { ...convoy, items: convoy.items.map((current, position) => (position === convoyIndex ? { ...packEntry, equipped: false } : current)) }
		};
	}

	if (packEntry !== null) {
		return { unit: UnitComponent.drop(unit, unitIndex), convoy: ConvoyComponent.store(convoy, packEntry) };
	}

	if (!UnitComponent.hasPackRoom(unit)) {
		return unchanged;
	}

	return {
		unit: { ...unit, inventory: [...unit.inventory, UnitComponent.received(convoyEntry as InventoryEntry, unit)] },
		convoy: { ...convoy, items: convoy.items.filter((_, position) => position !== convoyIndex) }
	};
}

/** The convoy with two of its entries swapped - tidying the train. Unchanged when either row holds nothing. */
export function reorderConvoy(convoy: ConvoyData, first: number, second: number): ConvoyData {
	if (first === second || convoy.items[first] === undefined || convoy.items[second] === undefined) {
		return convoy;
	}

	const items = [...convoy.items];
	[items[first], items[second]] = [items[second], items[first]];

	return { ...convoy, items };
}
