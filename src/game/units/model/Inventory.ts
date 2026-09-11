import { isCatalogItem, isCatalogWeapon } from "@/game/units/model/UnitCatalog";
import { InventoryEntry, InventoryKind, INVENTORY_SIZE, ItemData, resolveInventoryEntry, UnitData } from "@/game/units/model/UnitData";

/**
 * Pure inventory edits over a resolved [[UnitData]], kept off the component the
 * same way `UnitSystem` keeps its lookups off the entities. Nothing here mutates
 * its argument - callers write the result back through `UnitComponent.update`.
 */

/**
 * Readies the weapon in pack slot `index`, Fire-Emblem style: the weapon moves
 * to the front of the pack, becomes the only `equipped` entry and is mirrored
 * onto `unit.weapon`. Returns `unit` unchanged when that slot is not a weapon
 * the unit's class can wield.
 */
export function equipInventoryItem(unit: UnitData, index: number): UnitData {
	const target = unit.inventory[index];

	if (target === undefined || target.kind !== InventoryKind.WEAPON || !target.equippable || target.weapon === null) {
		return unit;
	}

	if (index === 0 && target.equipped) {
		return unit;
	}

	const reordered: InventoryEntry[] = unit.inventory.map((entry, position) => ({
		...entry,
		equipped: position === index && entry.kind === InventoryKind.WEAPON
	}));

	const [readied] = reordered.splice(index, 1);
	reordered.unshift(readied);

	return { ...unit, weapon: target.weapon, inventory: reordered };
}

/**
 * Puts the readied weapon away: `unit.weapon` becomes null and no pack entry is
 * `equipped`. Pack order is left alone. Returns `unit` unchanged when nothing
 * was readied.
 */
export function unequipInventoryItem(unit: UnitData): UnitData {
	if (unit.weapon === null && unit.inventory.every((entry) => !entry.equipped)) {
		return unit;
	}

	return {
		...unit,
		weapon: null,
		inventory: unit.inventory.map((entry) => (entry.equipped ? { ...entry, equipped: false } : entry))
	};
}

/**
 * Drops the pack entry in slot `index` for good. Dropping the readied weapon
 * leaves the unit unarmed (`weapon` null). Returns `unit` unchanged when the
 * slot is out of range.
 */
export function dropInventoryItem(unit: UnitData, index: number): UnitData {
	if (index < 0 || index >= unit.inventory.length) {
		return unit;
	}

	const dropped = unit.inventory[index];

	return {
		...unit,
		weapon: dropped.equipped ? null : unit.weapon,
		inventory: unit.inventory.filter((_, position) => position !== index)
	};
}

/**
 * Spends `count` uses off the weapon with id `weaponId` - one per swing in a
 * fight. A weapon that runs out is removed from the pack; if it was readied the
 * unit is left unarmed. Returns `unit` unchanged when nothing is spent.
 */
export function spendWeaponUses(unit: UnitData, weaponId: string, count: number): UnitData {
	if (count <= 0) {
		return unit;
	}

	const index = unit.inventory.findIndex((entry) => entry.id === weaponId && entry.kind === InventoryKind.WEAPON);

	if (index === -1) {
		return unit;
	}

	const entry = unit.inventory[index];
	const uses = Math.max(0, entry.uses - count);

	if (uses > 0) {
		const inventory = unit.inventory.map((current, position) => (position === index ? { ...current, uses } : current));
		return { ...unit, inventory };
	}

	// The weapon broke.
	return {
		...unit,
		weapon: entry.equipped ? null : unit.weapon,
		inventory: unit.inventory.filter((_, position) => position !== index)
	};
}

/**
 * Whether a pack entry is any use to the unit carrying it: a weapon only when
 * its class trains in that weapon type, a consumable always. A weapon traded to
 * a unit that cannot wield it is dead weight, and every pack list greys it out.
 */
export function isUsableEntry(entry: InventoryEntry): boolean {
	return entry.kind !== InventoryKind.WEAPON || entry.equippable;
}

/**
 * A pack entry a unit can use on itself to restore HP - a consumable whose
 * catalog `heal` is `"full"` or a positive number. Weapons and inert items are
 * never healing items.
 */
export function isHealingItem(entry: InventoryEntry): boolean {
	return entry.kind === InventoryKind.ITEM && entry.item !== null && (entry.item.heal === "full" || entry.item.heal > 0);
}

/**
 * HP `item` would restore to `unit` right now: its `heal` value (or the whole
 * wound, for a `"full"` item), clamped so it never carries the unit past its
 * maximum HP. Zero when the unit is already at full health.
 */
export function healingAmount(unit: UnitData, item: ItemData): number {
	const missing = Math.max(0, unit.stats.hp - unit.currentHP);
	const restored = item.heal === "full" ? missing : Math.max(0, item.heal);

	return Math.min(missing, restored);
}

/**
 * Uses the healing consumable in pack slot `index`: `currentHP` climbs by the
 * item's heal value (never past the unit's maximum), one charge is spent, and an
 * item that runs out is dropped from the pack. Returns `unit` unchanged when the
 * slot is not a healing item or the unit is already at full HP.
 */
export function useHealingItem(unit: UnitData, index: number): UnitData {
	const target = unit.inventory[index];

	if (target === undefined || !isHealingItem(target) || target.item === null) {
		return unit;
	}

	const restored = healingAmount(unit, target.item);

	if (restored <= 0) {
		return unit;
	}

	const uses = Math.max(0, target.uses - 1);
	const inventory = uses > 0 ? unit.inventory.map((entry, position) => (position === index ? { ...entry, uses } : entry)) : unit.inventory.filter((_, position) => position !== index);

	return { ...unit, currentHP: unit.currentHP + restored, inventory };
}

/** A slot the trade screen can put a cursor on - inside the pack, occupied or not. */
function isSlot(index: number): boolean {
	return Number.isInteger(index) && index >= 0 && index < INVENTORY_SIZE;
}

/**
 * An entry as it arrives in `unit`'s pack: never readied, and wieldable only
 * when the new holder's class trains in that weapon type - a sword handed to an
 * axe fighter is carried, not swung.
 */
function received(entry: InventoryEntry, unit: UnitData): InventoryEntry {
	return {
		...entry,
		equipped: false,
		equippable: entry.kind === InventoryKind.WEAPON && entry.weapon !== null && unit.weaponTypes.includes(entry.weapon.type)
	};
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
 * Rearranges one pack, the way the trade screen lets a unit tidy its own slots:
 * two carried entries change places, and an entry moved onto an empty slot goes
 * to the back of the pack. Only the order changes - nothing is readied or put
 * away - so `unit.weapon` still points at the same entry. Returns `unit`
 * unchanged when the move would do nothing.
 */
export function swapInventorySlots(unit: UnitData, first: number, second: number): UnitData {
	if (!isSlot(first) || !isSlot(second) || first === second) {
		return unit;
	}

	const from = unit.inventory[first] ?? null;
	const to = unit.inventory[second] ?? null;

	if (from === null && to === null) {
		return unit;
	}

	if (from === null || to === null) {
		// One end is an empty slot: the entry at the other end moves to the back.
		const inventory = [...unit.inventory];
		const [moved] = inventory.splice(from === null ? second : first, 1);
		inventory.push(moved);

		return inventory.every((entry, position) => entry === unit.inventory[position]) ? unit : { ...unit, inventory };
	}

	const inventory = [...unit.inventory];
	inventory[first] = to;
	inventory[second] = from;

	return { ...unit, inventory };
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

	if (left.id === right.id || !isSlot(leftIndex) || !isSlot(rightIndex)) {
		return unchanged;
	}

	const leftEntry = left.inventory[leftIndex] ?? null;
	const rightEntry = right.inventory[rightIndex] ?? null;

	if (leftEntry === null && rightEntry === null) {
		return unchanged;
	}

	if (leftEntry !== null && rightEntry !== null) {
		return {
			left: replaceEntry(left, leftIndex, received(rightEntry, left)),
			right: replaceEntry(right, rightIndex, received(leftEntry, right))
		};
	}

	if (leftEntry !== null) {
		return { left: dropInventoryItem(left, leftIndex), right: { ...right, inventory: [...right.inventory, received(leftEntry, right)] } };
	}

	return { left: { ...left, inventory: [...left.inventory, received(rightEntry, left)] }, right: dropInventoryItem(right, rightIndex) };
}

/** Whether the unit has a free slot - somewhere a gift could still go. */
export function hasPackRoom(unit: UnitData): boolean {
	return unit.inventory.length < INVENTORY_SIZE;
}

/**
 * Puts a catalog weapon or item into the back of `unit`'s pack - what a village
 * hands over. It arrives the way anything a unit is given arrives: never
 * readied, and wieldable only when the holder's class trains in that weapon
 * type. Returns `unit` unchanged when the id is in neither catalog or the pack
 * is already full, so a caller can tell nothing was taken by comparing.
 */
export function giveInventoryItem(unit: UnitData, catalogId: string): UnitData {
	if (!hasPackRoom(unit) || (!isCatalogWeapon(catalogId) && !isCatalogItem(catalogId))) {
		return unit;
	}

	const entry = resolveInventoryEntry(catalogId, unit.weaponTypes, "");

	return { ...unit, inventory: [...unit.inventory, received(entry, unit)] };
}
