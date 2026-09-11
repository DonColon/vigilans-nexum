import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { getItem, getUnitClass, getWeapon, isCatalogItem, isCatalogWeapon, ItemData, WeaponData, WeaponType } from "@/game/units/model/UnitCatalog";

/**
 * The catalog vocabulary lives in [[UnitCatalog]], which owns the rulebook the
 * sheets resolve against. It is re-exported here so nothing that already reads
 * a weapon or an item off this module has to learn a second import path.
 */
export { getWeapon, getItem, getUnitClass, WeaponType, LockKind, isStaff, STAT_NAMES, NO_BOOST } from "@/game/units/model/UnitCatalog";
export type { WeaponData, ItemData, UnitClassData, HealAmount, StatBoost, StatName } from "@/game/units/model/UnitCatalog";

/**
 * The eight-plus-one attributes every unit carries, matching the character
 * sheets in the wiki (`design/catalog`). Growth rates and stat caps use the
 * same shape - a percentage per level for growths, a ceiling for caps.
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
}

const STAT_KEYS: (keyof UnitStats)[] = ["hp", "mp", "strength", "magic", "dexterity", "speed", "luck", "defense", "resistance"];

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
 * On-disk unit sheet, one `*.unit.json` file per character. Base stats and
 * growths are the character's own; class and weapon are looked up by id from
 * the shared catalogs at load time.
 */
export interface UnitDocument {
	format: "vigilans-unit";
	version: 1;
	id: string;
	name: string;
	faction: UnitFaction;
	class: string;
	level: number;
	weapon: string;
	/**
	 * Weapon and item ids the unit carries, in pack order. The equipped `weapon`
	 * is added to the front when it is not already listed. Omitted, the pack is
	 * just the equipped weapon.
	 */
	inventory?: string[];
	/**
	 * Tiles of movement, overriding what the class grants. For the character who
	 * is meant to be quicker (or slower) than the rest of their class; left out,
	 * the class decides.
	 */
	movement?: number;
	/** Marks the army's leader - the cursor starts on this unit at the top of a battle. */
	commander?: boolean;
	stats: UnitStats;
	growths: UnitStats;
	maxStats: UnitStats;
}

/**
 * A unit sheet with its class and weapon resolved - the shape the
 * `UnitComponent` stores and every unit system reads. `currentHP` starts full;
 * `hasMoved` is cleared at the top of the owner's turn (once a turn system
 * exists - for now it only ever gets set).
 */
export interface UnitData extends JsonSchema {
	id: string;
	name: string;
	faction: UnitFaction;
	className: string;
	classLabel: string;
	level: number;
	/** Tiles of movement before per-tile terrain cost - the sheet's own, or the class's. */
	movement: number;
	/** The army's leader - see `CommanderComponent`. */
	commander: boolean;
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

function assertStats(value: unknown, where: string): UnitStats {
	if (typeof value !== "object" || value === null) {
		throw new GameError(`${where} is missing its stat block`);
	}

	const stats = value as Record<string, unknown>;

	for (const key of STAT_KEYS) {
		if (!Number.isFinite(stats[key])) {
			throw new GameError(`${where} is missing the "${key}" stat`);
		}
	}

	return value as UnitStats;
}

/**
 * Resolves one pack id to an [[InventoryEntry]]: a weapon (flagged `equippable`
 * when `classWeaponTypes` covers it, `equipped` when it matches `equippedId`) or
 * a consumable. Throws when the id is in neither catalog.
 */
export function resolveInventoryEntry(id: string, classWeaponTypes: readonly WeaponType[], equippedId: string): InventoryEntry {
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
 * Turns a parsed `*.unit.json` document into the resolved unit the ECS stores:
 * the character's own numbers plus the class and weapon pulled from the shared
 * catalogs.
 */
export function buildUnit(document: UnitDocument): UnitData {
	if (document.format !== "vigilans-unit") {
		throw new GameError(`Unit sheet has format "${document.format}", expected "vigilans-unit"`);
	}

	if (document.version !== 1) {
		throw new GameError(`Unit sheet "${document.id}" has version ${document.version}, this build reads version 1`);
	}

	if (typeof document.id !== "string" || document.id.length === 0) {
		throw new GameError("Unit sheet is missing its id");
	}

	if (document.faction !== UnitFaction.PLAYER && document.faction !== UnitFaction.ENEMY) {
		throw new GameError(`Unit "${document.id}" has unknown faction "${document.faction}"`);
	}

	if (!Number.isInteger(document.level) || document.level <= 0) {
		throw new GameError(`Unit "${document.id}" needs a positive integer level, got ${document.level}`);
	}

	if (document.movement !== undefined && (!Number.isInteger(document.movement) || document.movement <= 0)) {
		throw new GameError(`Unit "${document.id}" needs a positive integer movement, got ${document.movement}`);
	}

	const unitClass = getUnitClass(document.class);
	const weapon = getWeapon(document.weapon);

	if (!unitClass.weaponTypes.includes(weapon.type)) {
		throw new GameError(`Unit "${document.id}" is a ${unitClass.name} and cannot wield a ${weapon.type}`);
	}

	const stats = assertStats(document.stats, `Unit "${document.id}"`);

	const packIds = [...(document.inventory ?? [document.weapon])];

	if (!packIds.includes(document.weapon)) {
		packIds.unshift(document.weapon);
	}

	if (packIds.length > INVENTORY_SIZE) {
		throw new GameError(`Unit "${document.id}" carries ${packIds.length} entries, a pack holds ${INVENTORY_SIZE}`);
	}

	const inventory = packIds.map((id) => resolveInventoryEntry(id, unitClass.weaponTypes, document.weapon));
	const equippedEntry = inventory.find((entry) => entry.equipped);

	return {
		id: document.id,
		name: document.name,
		faction: document.faction,
		className: unitClass.id,
		classLabel: unitClass.name,
		level: document.level,
		movement: document.movement ?? unitClass.movement,
		commander: document.commander ?? false,
		weaponTypes: [...unitClass.weaponTypes],
		stats,
		growths: assertStats(document.growths, `Unit "${document.id}"`),
		maxStats: assertStats(document.maxStats, `Unit "${document.id}"`),
		currentHP: stats.hp,
		weapon: equippedEntry?.weapon ?? weapon,
		inventory,
		hasMoved: false
	};
}
