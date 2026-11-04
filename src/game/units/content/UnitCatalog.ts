import { AssetStorage } from "@/core/assets/AssetStorage";
import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";

/**
 * The shared catalogs every unit sheet resolves against - the game's rulebook.
 * They are authored in `src/assets/data/catalog/*.json` and shipped as JSON
 * assets, so they arrive at runtime rather than in the bundle.
 *
 * The lookups over them stay **synchronous**: the combat math and every unit
 * system read them mid-frame. `Game.start` has the bundle in `AssetStorage`
 * before the first state builds anything, so one seeding call is all the
 * asynchrony needed - see {@link loadUnitCatalogs}.
 *
 * This module owns the catalog vocabulary (weapon types and the three resolved
 * shapes) so that [[UnitData]] can depend on it and not the other way round.
 */

/** The weapon categories a class may be trained in - see `design/catalog/Unit-Classes.md`. */
export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType];

export const WeaponType = {
	SWORD: "sword",
	LANCE: "lance",
	AXE: "axe",
	BOW: "bow",
	KNIFE: "knife",
	GAUNTLET: "gauntlet",
	/** A healing staff: carried and readied like a weapon, but it never strikes - see {@link isStaff}. */
	STAFF: "staff"
} as const;

const weaponTypeValues = new Set<string>(Object.values(WeaponType));

export function assertWeaponType(value: string, where: string): WeaponType {
	if (!weaponTypeValues.has(value)) {
		throw new GameError(`${where} refers to unknown weapon type "${value}"`);
	}

	return value as WeaponType;
}

/** A weapon as authored in `catalog/weapons.json`, resolved onto the unit that holds it. */
export interface WeaponData extends JsonSchema {
	id: string;
	name: string;
	type: WeaponType;
	rank: string;
	/** Added to strength (or magic) when the hit lands. For a staff: the HP it restores on top of the healer's magic. */
	might: number;
	hit: number;
	critical: number;
	weight: number;
	/** Closest and furthest tile distance the weapon can strike - or, for a staff, reach an ally - Manhattan. */
	minRange: number;
	maxRange: number;
	uses: number;
	/**
	 * Experience one use of a staff earns its wielder - Radiant Dawn prints it on
	 * the staff's description. 0 for anything that is swung rather than raised:
	 * a fight is scored on the opponent, not the weapon.
	 */
	experience: number;
}

/**
 * Whether a weapon is a staff. A staff sits in the pack and is readied like any
 * other weapon, but it heals rather than strikes: it never reaches an enemy,
 * never counters and lights no attack tiles. Everything that asks "what can this
 * unit swing?" filters on this; the heal feature is what asks for staves.
 */
export function isStaff(weapon: WeaponData): boolean {
	return weapon.type === WeaponType.STAFF;
}

/** How much HP a consumable restores: a flat amount, or `"full"` for a complete heal. */
export type HealAmount = number | "full";

/** What a key opens - Fire Emblem's door keys and chest keys are not interchangeable. */
export type LockKind = (typeof LockKind)[keyof typeof LockKind];

export const LockKind = {
	DOOR: "door",
	CHEST: "chest"
} as const;

const lockKindValues = new Set<string>(Object.values(LockKind));

/**
 * The stat names a booster may raise - the sheet's eight-plus-one, and
 * movement. Movement is a stat like the others: it starts at what the class
 * grants, but Boots raise it for good, so a unit's own tiles can drift away
 * from its class's.
 */
export type StatName = "hp" | "mp" | "strength" | "magic" | "dexterity" | "speed" | "luck" | "defense" | "resistance" | "movement";

export const STAT_NAMES: readonly StatName[] = ["hp", "mp", "strength", "magic", "dexterity", "speed", "luck", "defense", "resistance", "movement"];

/**
 * The cap a sheet's movement stops at when it does not name its own - Fire
 * Emblem's usual ceiling, however many pairs of Boots a unit is fed.
 */
export const MOVEMENT_CAP = 15;

/** The permanent stat gains a consumable grants, one entry per stat, zero where it grants nothing. */
export type StatBoost = Record<StatName, number>;

/** A boost that raises nothing - what every item without a `boost` block resolves to. */
export const NO_BOOST: StatBoost = { hp: 0, mp: 0, strength: 0, magic: 0, dexterity: 0, speed: 0, luck: 0, defense: 0, resistance: 0, movement: 0 };

/**
 * A consumable as authored in `catalog/items.json` - anything a unit carries
 * that is not a weapon. Three kinds share the shape: a healing item (`heal`), a
 * stat booster (`boost`) and a key (`unlocks`); an item may also be none of
 * them and just sit in the pack.
 */
export interface ItemData extends JsonSchema {
	id: string;
	name: string;
	/** Charges left before the item is spent. */
	uses: number;
	/** HP restored when a unit uses this - a flat number, `"full"`, or 0 for an item that does not heal. */
	heal: HealAmount;
	/** Permanent stat gains when a unit uses this - every stat listed, zero where the item grants nothing. */
	boost: StatBoost;
	/** What this key opens, or `""` for an item that is not a key. */
	unlocks: LockKind | "";
	description: string;
}

/**
 * Where a class sits on its promotion ladder - Radiant Dawn's three tiers. A
 * `base` class is the one a unit starts in; `second` is what it promotes to and
 * `third` what that promotes to. The tier is what the experience formulas read
 * to weigh a level: a level 1 unit in a second-tier class fights like a level 21.
 */
export type ClassTier = (typeof ClassTier)[keyof typeof ClassTier];

export const ClassTier = {
	BASE: "base",
	SECOND: "second",
	THIRD: "third"
} as const;

const classTierValues = new Set<string>(Object.values(ClassTier));

export function assertClassTier(value: string, where: string): ClassTier {
	if (!classTierValues.has(value)) {
		throw new GameError(`${where} has unknown class tier "${value}"`);
	}

	return value as ClassTier;
}

/** A class as authored in `catalog/classes.json`. */
export interface UnitClassData {
	id: string;
	name: string;
	tier: ClassTier;
	weaponTypes: WeaponType[];
	/** Tiles of movement the class grants - the `movement` stat of a sheet that does not set its own. */
	movement: number;
	ability: string;
	promotesTo: string[];
}

/** The catalog entries as they sit on disk, before their weapon types are checked. */
type RawClass = { name: string; tier: string; weaponTypes: string[]; movement: number; ability: string; promotesTo: string[] };
type RawWeapon = { name: string; type: string; rank: string; might: number; hit: number; critical: number; weight: number; minRange: number; maxRange: number; uses: number; experience?: number };
type RawItem = { name: string; uses: number; heal?: HealAmount; boost?: Partial<StatBoost>; unlocks?: string; description: string };

/** The three catalog documents: a `format` / `version` header over a keyed record. */
export interface ClassCatalogDocument {
	classes: Record<string, RawClass>;
}

export interface WeaponCatalogDocument {
	weapons: Record<string, RawWeapon>;
}

export interface ItemCatalogDocument {
	items: Record<string, RawItem>;
}

export interface UnitCatalogs {
	classes: Record<string, RawClass>;
	weapons: Record<string, RawWeapon>;
	items: Record<string, RawItem>;
}

/** Asset ids the three catalogs are declared under in `asset.manifest.ts`. */
export const CATALOG_ASSETS = {
	classes: "catalog-classes",
	weapons: "catalog-weapons",
	items: "catalog-items"
} as const;

let catalogs: UnitCatalogs | null = null;

/**
 * Seeds the catalogs by hand. The game seeds them from the asset bundle through
 * {@link loadUnitCatalogs}; a test that builds units without one calls this with
 * the documents directly.
 */
export function setUnitCatalogs(seeded: UnitCatalogs): void {
	catalogs = seeded;
}

/** Reads the three catalog assets out of storage and seeds the registry with them. */
export function loadUnitCatalogs(assets: AssetStorage): void {
	setUnitCatalogs({
		classes: assets.getJson<ClassCatalogDocument>(CATALOG_ASSETS.classes).classes,
		weapons: assets.getJson<WeaponCatalogDocument>(CATALOG_ASSETS.weapons).weapons,
		items: assets.getJson<ItemCatalogDocument>(CATALOG_ASSETS.items).items
	});
}

/** Drops the seeded catalogs - for a test that needs to reach the unseeded case. */
export function clearUnitCatalogs(): void {
	catalogs = null;
}

/** Whether the catalogs have been seeded yet. */
export function hasUnitCatalogs(): boolean {
	return catalogs !== null;
}

/**
 * The seeded catalogs, or a clear failure naming what is missing. Reaching a
 * lookup before the bundle has landed is a wiring mistake rather than a data
 * one, so it is worth saying so plainly.
 */
function catalog<K extends keyof UnitCatalogs>(name: K): UnitCatalogs[K] {
	if (catalogs === null) {
		throw new GameError(`The "${name}" catalog has not been loaded - seed it with loadUnitCatalogs() once the asset bundle is in storage`);
	}

	return catalogs[name];
}

/** Resolves a weapon id against the weapon catalog. */
export function getWeapon(id: string): WeaponData {
	const weapon = catalog("weapons")[id];

	if (weapon === undefined) {
		throw new GameError(`Weapon "${id}" is not in the catalog`);
	}

	return { id, experience: 0, ...weapon, type: assertWeaponType(weapon.type, `Weapon "${id}"`) };
}

/** Resolves a consumable id against the item catalog. */
export function getItem(id: string): ItemData {
	const item = catalog("items")[id];

	if (item === undefined) {
		throw new GameError(`Item "${id}" is not in the catalog`);
	}

	const { boost, unlocks, ...rest } = item;

	if (unlocks !== undefined && !lockKindValues.has(unlocks)) {
		throw new GameError(`Item "${id}" unlocks unknown lock kind "${unlocks}"`);
	}

	return { id, heal: 0, ...rest, boost: { ...NO_BOOST, ...boost }, unlocks: (unlocks ?? "") as LockKind | "" };
}

/** Resolves a class id against the class catalog. */
export function getUnitClass(id: string): UnitClassData {
	const unitClass = catalog("classes")[id];

	if (unitClass === undefined) {
		throw new GameError(`Class "${id}" is not in the catalog`);
	}

	const weaponTypes = unitClass.weaponTypes.map((type) => assertWeaponType(type, `Class "${id}"`));

	return { id, ...unitClass, tier: assertClassTier(unitClass.tier, `Class "${id}"`), weaponTypes };
}

/**
 * The name the catalogs give an id, whichever of them it is in - for a notice
 * about an item that is in neither a pack nor the map, and so has no resolved
 * entry to read a name off. Falls back to the id itself for an unknown one.
 */
export function catalogName(id: string): string {
	if (isCatalogWeapon(id)) {
		return getWeapon(id).name;
	}

	if (isCatalogItem(id)) {
		return getItem(id).name;
	}

	return id;
}

/** Whether the catalogs know this id as a weapon - what tells a pack entry's kind. */
export function isCatalogWeapon(id: string): boolean {
	return catalog("weapons")[id] !== undefined;
}

/** Whether the catalogs know this id as a consumable. */
export function isCatalogItem(id: string): boolean {
	return catalog("items")[id] !== undefined;
}
