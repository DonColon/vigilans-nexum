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
	GAUNTLET: "gauntlet"
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

/** A consumable as authored in `catalog/items.json` - anything a unit carries that is not a weapon. */
export interface ItemData extends JsonSchema {
	id: string;
	name: string;
	/** Charges left before the item is spent. */
	uses: number;
	/** HP restored when a unit uses this - a flat number, `"full"`, or 0 for an item that does not heal. */
	heal: HealAmount;
	description: string;
}

/** A class as authored in `catalog/classes.json`. */
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

/** The catalog entries as they sit on disk, before their weapon types are checked. */
type RawClass = { name: string; tier: string; weaponTypes: string[]; movement: number; ability: string; promotesTo: string[] };
type RawWeapon = { name: string; type: string; rank: string; might: number; hit: number; critical: number; weight: number; minRange: number; maxRange: number; uses: number };
type RawItem = { name: string; uses: number; heal?: HealAmount; description: string };

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

	return { id, ...weapon, type: assertWeaponType(weapon.type, `Weapon "${id}"`) };
}

/** Resolves a consumable id against the item catalog. */
export function getItem(id: string): ItemData {
	const item = catalog("items")[id];

	if (item === undefined) {
		throw new GameError(`Item "${id}" is not in the catalog`);
	}

	return { id, heal: 0, ...item };
}

/** Resolves a class id against the class catalog. */
export function getUnitClass(id: string): UnitClassData {
	const unitClass = catalog("classes")[id];

	if (unitClass === undefined) {
		throw new GameError(`Class "${id}" is not in the catalog`);
	}

	const weaponTypes = unitClass.weaponTypes.map((type) => assertWeaponType(type, `Class "${id}"`));

	return { id, ...unitClass, weaponTypes };
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
