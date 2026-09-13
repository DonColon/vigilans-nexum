import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GameError } from "@/core/GameError";
import { ClassTier, getItem, getWeapon, isCatalogItem, isCatalogWeapon, isStaff, ItemData, LockKind, NO_BOOST, STAT_NAMES, StatBoost, WeaponData, WeaponType } from "@/game/units/content/UnitCatalog";

/**
 * The eight-plus-one attributes every unit carries, matching the character
 * sheets in the wiki (`design/catalog`), plus movement. Growth rates and stat
 * caps use the same shape - a percentage per level for growths, a ceiling for
 * caps.
 *
 * Movement is the odd one out on disk: a sheet may leave it off, in which case
 * the class decides (see `SheetStats` in the unit sheets). Resolved, it is
 * always there, so a booster can raise it like any other stat.
 */
export interface UnitStats extends JsonSchema {
	hp: number;
	mp: number;
	strength: number;
	magic: number;
	dexterity: number;
	speed: number;
	luck: number;
	defense: number;
	resistance: number;
	/** Tiles of movement before per-tile terrain cost. */
	movement: number;
}

/** Which side of the battle a unit fights on. Only `player` units answer to the cursor. */
export type UnitFaction = (typeof UnitFaction)[keyof typeof UnitFaction];

export const UnitFaction = {
	PLAYER: "player",
	ENEMY: "enemy"
} as const;

/** What an [[InventoryEntry]] holds - a weapon that can be readied, or a plain consumable. */
export type InventoryKind = (typeof InventoryKind)[keyof typeof InventoryKind];

export const InventoryKind = {
	WEAPON: "weapon",
	ITEM: "item"
} as const;

/**
 * Slots in a unit's pack: a unit carries at most this many weapons and items,
 * and the trade screen shows exactly this many rows a side, so a free slot is
 * somewhere an item can be put down. Anything a unit is given once all eight are
 * taken goes to the army convoy instead - see src/game/convoy.
 */
export const INVENTORY_SIZE = 8;

/**
 * Experience a level is worth: the hundredth point levels the unit up and the
 * count starts over, so a sheet never carries more than 99. How the points are
 * earned is the experience feature's - see src/game/experience.
 */
export const LEVEL_UP_EXPERIENCE = 100;

/**
 * The level a class tops out at - Radiant Dawn's twenty per tier. A unit at
 * the top holds at 99 points until it promotes (which is not modelled yet).
 */
export const MAX_LEVEL = 20;

/**
 * One line of a unit's pack, resolved from the catalogs. Weapons carry a
 * `weapon` payload and may be `equippable` (the holder's class trains in that
 * weapon type); consumables carry an `item` payload and never are. At most one
 * weapon in a pack is `equipped` - the one mirrored onto `UnitData.weapon`;
 * none is once the unit has unequipped.
 */
export interface InventoryEntry extends JsonSchema {
	id: string;
	name: string;
	kind: InventoryKind;
	/** The holder's class can wield this. Always false for consumables. */
	equippable: boolean;
	/** This is the weapon the unit currently has readied. */
	equipped: boolean;
	/** Charges left before the weapon breaks / the item is spent. Starts at `maxUses`. */
	uses: number;
	/** Total charges when new - the catalog value. */
	maxUses: number;
	/** Resolved weapon when `kind` is `weapon`, else null. */
	weapon: WeaponData | null;
	/** Resolved consumable when `kind` is `item`, else null. */
	item: ItemData | null;
}

/**
 * A unit sheet with its class and weapon resolved - the shape the
 * `UnitComponent` stores and every unit system reads. `currentHP` starts full;
 * `hasMoved` is cleared at the top of the owner's turn.
 */
export interface UnitData extends JsonSchema {
	id: string;
	name: string;
	faction: UnitFaction;
	className: string;
	classLabel: string;
	/** Which rung of the promotion ladder the class is on - what a level is worth in a fight. */
	classTier: ClassTier;
	level: number;
	/** Experience towards the next level, 0-99; the hundredth point is the level - see src/game/experience. */
	experience: number;
	/** The army's leader - see `CommanderComponent`. */
	commander: boolean;
	/** The chapter's boss - worth extra experience to whoever fells it. */
	boss: boolean;
	weaponTypes: WeaponType[];
	stats: UnitStats;
	growths: UnitStats;
	maxStats: UnitStats;
	currentHP: number;
	/** The readied weapon - the same object as the `equipped` entry in `inventory` - or null when the unit has unequipped. */
	weapon: WeaponData | null;
	/** Everything the unit carries: weapons (at most one readied) and consumables. */
	inventory: InventoryEntry[];
	hasMoved: boolean;
}

/**
 * A playable or hostile unit on the battle map: its resolved sheet - stats,
 * class, equipped weapon - and whether it has already moved this turn. Where it
 * stands is the shared `GridPositionComponent` on the same entity, exactly as
 * with the cursor.
 *
 * The statics are the pure operations over a single [[UnitData]] - pack edits,
 * item checks, what a unit can wield or turn a key in. None of them mutates its
 * argument: an edit returns a new sheet, or the very same object when nothing
 * changed, so a caller can compose several before one `update()` and tell a
 * no-op by comparing. Anything that looks at a second unit or at the map is a
 * rule, not a unit operation - see the feature `rules/` folders.
 */
export class UnitComponent extends Component<UnitData> {
	public static readonly type = "unit";

	/**
	 * Resolves one pack id to an [[InventoryEntry]]: a weapon (flagged `equippable`
	 * when `classWeaponTypes` covers it, `equipped` when it matches `equippedId`) or
	 * a consumable. Throws when the id is in neither catalog.
	 */
	public static resolveEntry(id: string, classWeaponTypes: readonly WeaponType[], equippedId: string): InventoryEntry {
		if (isCatalogWeapon(id)) {
			const weapon = getWeapon(id);

			return {
				id,
				name: weapon.name,
				kind: InventoryKind.WEAPON,
				equippable: classWeaponTypes.includes(weapon.type),
				equipped: id === equippedId,
				uses: weapon.uses,
				maxUses: weapon.uses,
				weapon,
				item: null
			};
		}

		if (isCatalogItem(id)) {
			const item = getItem(id);

			return { id, name: item.name, kind: InventoryKind.ITEM, equippable: false, equipped: false, uses: item.uses, maxUses: item.uses, weapon: null, item };
		}

		throw new GameError(`Inventory entry "${id}" is not a known weapon or item`);
	}

	/**
	 * Readies the weapon in pack slot `index`, Fire-Emblem style: the weapon moves
	 * to the front of the pack, becomes the only `equipped` entry and is mirrored
	 * onto `unit.weapon`. Returns `unit` unchanged when that slot is not a weapon
	 * the unit's class can wield.
	 */
	public static equip(unit: UnitData, index: number): UnitData {
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
	public static unequip(unit: UnitData): UnitData {
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
	public static drop(unit: UnitData, index: number): UnitData {
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
	public static spendWeaponUses(unit: UnitData, weaponId: string, count: number): UnitData {
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
	public static isUsableEntry(entry: InventoryEntry): boolean {
		return entry.kind !== InventoryKind.WEAPON || entry.equippable;
	}

	/**
	 * A pack entry a unit can use on itself to restore HP - a consumable whose
	 * catalog `heal` is `"full"` or a positive number. Weapons and inert items are
	 * never healing items.
	 */
	public static isHealingItem(entry: InventoryEntry): boolean {
		return entry.kind === InventoryKind.ITEM && entry.item !== null && (entry.item.heal === "full" || entry.item.heal > 0);
	}

	/**
	 * HP `item` would restore to `unit` right now: its `heal` value (or the whole
	 * wound, for a `"full"` item), clamped so it never carries the unit past its
	 * maximum HP. Zero when the unit is already at full health.
	 */
	public static healingAmount(unit: UnitData, item: ItemData): number {
		const missing = Math.max(0, unit.stats.hp - unit.currentHP);
		const restored = item.heal === "full" ? missing : Math.max(0, item.heal);

		return Math.min(missing, restored);
	}

	/**
	 * Spends one charge off the pack entry in slot `index` - what every use of a
	 * consumable and every turn of a key ends with. An entry that runs out is
	 * dropped from the pack; a readied weapon that breaks leaves the unit unarmed.
	 * Returns `unit` unchanged when the slot is out of range.
	 */
	public static spendUse(unit: UnitData, index: number): UnitData {
		const entry = unit.inventory[index];

		if (entry === undefined) {
			return unit;
		}

		const uses = Math.max(0, entry.uses - 1);

		if (uses > 0) {
			return { ...unit, inventory: unit.inventory.map((current, position) => (position === index ? { ...current, uses } : current)) };
		}

		return UnitComponent.drop(unit, index);
	}

	/**
	 * Uses the healing consumable in pack slot `index`: `currentHP` climbs by the
	 * item's heal value (never past the unit's maximum), one charge is spent, and an
	 * item that runs out is dropped from the pack. Returns `unit` unchanged when the
	 * slot is not a healing item or the unit is already at full HP.
	 */
	public static useHealingItem(unit: UnitData, index: number): UnitData {
		const target = unit.inventory[index];

		if (target === undefined || !UnitComponent.isHealingItem(target) || target.item === null) {
			return unit;
		}

		const restored = UnitComponent.healingAmount(unit, target.item);

		if (restored <= 0) {
			return unit;
		}

		return UnitComponent.spendUse({ ...unit, currentHP: unit.currentHP + restored }, index);
	}

	/**
	 * A pack entry that raises a stat for good when used - Fire Emblem's Energy
	 * Drop, Speedwing and the rest: a consumable whose catalog `boost` raises
	 * anything at all.
	 */
	public static isBoostingItem(entry: InventoryEntry): boolean {
		return entry.kind === InventoryKind.ITEM && entry.item !== null && UnitComponent.isAnyBoost(entry.item.boost);
	}

	/**
	 * What `item` would actually add to `unit`'s stats right now: each gain clamped
	 * so no stat climbs past the sheet's cap for it, and zero for a stat already
	 * sitting on its cap. All zeros when the item would do nothing - which is when
	 * "Use" stays off the menu.
	 */
	public static boostGains(unit: UnitData, item: ItemData): StatBoost {
		const gains: StatBoost = { ...NO_BOOST };

		for (const stat of STAT_NAMES) {
			gains[stat] = Math.max(0, Math.min(item.boost[stat], unit.maxStats[stat] - unit.stats[stat]));
		}

		return gains;
	}

	/** Whether any stat in a boost is above zero. */
	public static isAnyBoost(boost: StatBoost): boolean {
		return STAT_NAMES.some((stat) => boost[stat] > 0);
	}

	/**
	 * Uses the stat booster in pack slot `index`: every stat it raises goes up by
	 * its clamped gain, a raised HP maximum lifts the current HP by the same amount
	 * (the unit is not wounded by growing), one charge is spent, and an item that
	 * runs out is dropped from the pack. Returns `unit` unchanged when the slot is
	 * not a booster or every stat it would raise is already capped.
	 */
	public static useBoostingItem(unit: UnitData, index: number): UnitData {
		const target = unit.inventory[index];

		if (target === undefined || !UnitComponent.isBoostingItem(target) || target.item === null) {
			return unit;
		}

		const gains = UnitComponent.boostGains(unit, target.item);

		if (!UnitComponent.isAnyBoost(gains)) {
			return unit;
		}

		const stats: UnitStats = { ...unit.stats };

		for (const stat of STAT_NAMES) {
			stats[stat] += gains[stat];
		}

		return UnitComponent.spendUse({ ...unit, stats, currentHP: unit.currentHP + gains.hp }, index);
	}

	/**
	 * Whether the pack entry can be used on the unit carrying it right now: a
	 * healing item while it is wounded, a booster while something it raises is
	 * still below its cap. A key is turned at a door or a chest, never "used" from
	 * the pack, and a weapon is swung, not used.
	 */
	public static canUseItem(unit: UnitData, entry: InventoryEntry): boolean {
		if (entry.item === null) {
			return false;
		}

		if (UnitComponent.isHealingItem(entry)) {
			return UnitComponent.healingAmount(unit, entry.item) > 0;
		}

		return UnitComponent.isBoostingItem(entry) && UnitComponent.isAnyBoost(UnitComponent.boostGains(unit, entry.item));
	}

	/**
	 * Uses whichever consumable is in pack slot `index` - the one "Use" row for
	 * every kind of item. Returns `unit` unchanged when the slot holds nothing that
	 * can be used on the unit right now.
	 */
	public static useItem(unit: UnitData, index: number): UnitData {
		const target = unit.inventory[index];

		if (target === undefined) {
			return unit;
		}

		if (UnitComponent.isHealingItem(target)) {
			return UnitComponent.useHealingItem(unit, index);
		}

		return UnitComponent.useBoostingItem(unit, index);
	}

	/** The pack slot of the first key that opens a lock of this kind, or -1 when the unit carries none. */
	public static keyIndex(unit: UnitData, kind: LockKind): number {
		return unit.inventory.findIndex((entry) => entry.kind === InventoryKind.ITEM && entry.item !== null && entry.item.unlocks === kind);
	}

	/** Whether the unit carries what opens a lock of this kind. Only the player's own units ever turn a key. */
	public static canUnlock(unit: UnitData, kind: LockKind): boolean {
		return unit.faction === UnitFaction.PLAYER && UnitComponent.keyIndex(unit, kind) >= 0;
	}

	/**
	 * The staves `unit` carries and can raise: staff entries its class trains in,
	 * in pack order. A staff handed to a swordsman is dead weight and is not one
	 * of them.
	 */
	public static staves(unit: UnitData): InventoryEntry[] {
		return unit.inventory.filter((entry) => entry.kind === InventoryKind.WEAPON && entry.equippable && entry.weapon !== null && isStaff(entry.weapon));
	}

	/** A slot the trade screen can put a cursor on - inside the pack, occupied or not. */
	public static isSlot(index: number): boolean {
		return Number.isInteger(index) && index >= 0 && index < INVENTORY_SIZE;
	}

	/**
	 * An entry as it arrives in `unit`'s pack: never readied, and wieldable only
	 * when the new holder's class trains in that weapon type - a sword handed to an
	 * axe fighter is carried, not swung.
	 */
	public static received(entry: InventoryEntry, unit: UnitData): InventoryEntry {
		return {
			...entry,
			equipped: false,
			equippable: entry.kind === InventoryKind.WEAPON && entry.weapon !== null && unit.weaponTypes.includes(entry.weapon.type)
		};
	}

	/**
	 * Rearranges one pack, the way the trade screen lets a unit tidy its own slots:
	 * two carried entries change places, and an entry moved onto an empty slot goes
	 * to the back of the pack. Only the order changes - nothing is readied or put
	 * away - so `unit.weapon` still points at the same entry. Returns `unit`
	 * unchanged when the move would do nothing.
	 */
	public static swapSlots(unit: UnitData, first: number, second: number): UnitData {
		if (!UnitComponent.isSlot(first) || !UnitComponent.isSlot(second) || first === second) {
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

	/** Whether the unit has a free slot - somewhere a gift could still go. */
	public static hasPackRoom(unit: UnitData): boolean {
		return unit.inventory.length < INVENTORY_SIZE;
	}

	/**
	 * Puts a catalog weapon or item into the back of `unit`'s pack - what a village
	 * hands over. It arrives the way anything a unit is given arrives: never
	 * readied, and wieldable only when the holder's class trains in that weapon
	 * type. Returns `unit` unchanged when the id is in neither catalog or the pack
	 * is already full, so a caller can tell nothing was taken by comparing.
	 */
	public static give(unit: UnitData, catalogId: string): UnitData {
		if (!UnitComponent.hasPackRoom(unit) || (!isCatalogWeapon(catalogId) && !isCatalogItem(catalogId))) {
			return unit;
		}

		const entry = UnitComponent.resolveEntry(catalogId, unit.weaponTypes, "");

		return { ...unit, inventory: [...unit.inventory, UnitComponent.received(entry, unit)] };
	}
}
