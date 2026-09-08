import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import classesDocument from "@/game/units/data/classes.json";
import itemsDocument from "@/game/units/data/items.json";
import weaponsDocument from "@/game/units/data/weapons.json";

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

/** The weapon categories a class may be trained in - see `design/catalog/Unit-Classes.md`. */
export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType];

export const WeaponType = {
	SWORD: "sword",
	LANCE: "lance",
	AXE: "axe",
	BOW: "bow",
	KNIFE: "knife",
	GAUNTLET: "gauntlet"
} as const;

const weaponTypeValues = new Set<string>(Object.values(WeaponType));

/** Which side of the battle a unit fights on. Only `player` units answer to the cursor. */
export type UnitFaction = (typeof UnitFaction)[keyof typeof UnitFaction];

export const UnitFaction = {
	PLAYER: "player",
	ENEMY: "enemy"
} as const;

/** A weapon as authored in `data/weapons.json`, resolved onto the unit that holds it. */
export interface WeaponData extends JsonSchema {
	id: string;
	name: string;
	type: WeaponType;
	rank: string;
	/** Added to strength (or magic) when the hit lands. */
	might: number;
	hit: number;
	critical: number;
	weight: number;
	/** Closest and furthest tile distance the weapon can strike, Manhattan. */
	minRange: number;
	maxRange: number;
	uses: number;
}

/** How much HP a consumable restores: a flat amount, or `"full"` for a complete heal. */
export type HealAmount = number | "full";

/** A consumable as authored in `data/items.json` - anything a unit carries that is not a weapon. */
export interface ItemData extends JsonSchema {
	id: string;
	name: string;
	/** Charges left before the item is spent. */
	uses: number;
	/** HP restored when a unit uses this - a flat number, `"full"`, or 0 for an item that does not heal. */
	heal: HealAmount;
	description: string;
}

/** What an [[InventoryEntry]] holds - a weapon that can be readied, or a plain consumable. */
export type InventoryKind = (typeof InventoryKind)[keyof typeof InventoryKind];

export const InventoryKind = {
	WEAPON: "weapon",
	ITEM: "item"
} as const;

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

/** A class as authored in `data/classes.json`. */
export interface UnitClassData {
	id: string;
	name: string;
	tier: string;
	weaponTypes: WeaponType[];
	/** Tiles of movement the class is granted before terrain cost. */
	movement: number;
	ability: string;
	promotesTo: string[];
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
	/** Base movement from the class, before per-tile terrain cost. */
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

type RawClass = { name: string; tier: string; weaponTypes: string[]; movement: number; ability: string; promotesTo: string[] };
type RawWeapon = { name: string; type: string; rank: string; might: number; hit: number; critical: number; weight: number; minRange: number; maxRange: number; uses: number };
type RawItem = { name: string; uses: number; heal?: HealAmount; description: string };

const classCatalog = classesDocument.classes as Record<string, RawClass>;
const weaponCatalog = weaponsDocument.weapons as Record<string, RawWeapon>;
const itemCatalog = itemsDocument.items as Record<string, RawItem>;

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

function assertWeaponType(value: string, where: string): WeaponType {
	if (!weaponTypeValues.has(value)) {
		throw new GameError(`${where} refers to unknown weapon type "${value}"`);
	}

	return value as WeaponType;
}

/** Resolves a weapon id against `data/weapons.json`. */
export function getWeapon(id: string): WeaponData {
	const weapon = weaponCatalog[id];

	if (weapon === undefined) {
		throw new GameError(`Weapon "${id}" is not in the catalog`);
	}

	return { id, ...weapon, type: assertWeaponType(weapon.type, `Weapon "${id}"`) };
}

/** Resolves a consumable id against `data/items.json`. */
export function getItem(id: string): ItemData {
	const item = itemCatalog[id];

	if (item === undefined) {
		throw new GameError(`Item "${id}" is not in the catalog`);
	}

	return { id, heal: 0, ...item };
}

/**
 * Resolves one pack id to an [[InventoryEntry]]: a weapon (flagged `equippable`
 * when `classWeaponTypes` covers it, `equipped` when it matches `equippedId`) or
 * a consumable. Throws when the id is in neither catalog.
 */
export function resolveInventoryEntry(id: string, classWeaponTypes: readonly WeaponType[], equippedId: string): InventoryEntry {
	if (weaponCatalog[id] !== undefined) {
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

	if (itemCatalog[id] !== undefined) {
		const item = getItem(id);

		return { id, name: item.name, kind: InventoryKind.ITEM, equippable: false, equipped: false, uses: item.uses, maxUses: item.uses, weapon: null, item };
	}

	throw new GameError(`Inventory entry "${id}" is not a known weapon or item`);
}

/** Resolves a class id against `data/classes.json`. */
export function getUnitClass(id: string): UnitClassData {
	const unitClass = classCatalog[id];

	if (unitClass === undefined) {
		throw new GameError(`Class "${id}" is not in the catalog`);
	}

	const weaponTypes = unitClass.weaponTypes.map((type) => assertWeaponType(type, `Class "${id}"`));

	return { id, ...unitClass, weaponTypes };
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

	const inventory = packIds.map((id) => resolveInventoryEntry(id, unitClass.weaponTypes, document.weapon));
	const equippedEntry = inventory.find((entry) => entry.equipped);

	return {
		id: document.id,
		name: document.name,
		faction: document.faction,
		className: unitClass.id,
		classLabel: unitClass.name,
		level: document.level,
		movement: unitClass.movement,
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
