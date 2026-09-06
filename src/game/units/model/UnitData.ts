import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import classesDocument from "@/game/units/data/classes.json";
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
	weaponTypes: WeaponType[];
	stats: UnitStats;
	growths: UnitStats;
	maxStats: UnitStats;
	currentHP: number;
	weapon: WeaponData;
	hasMoved: boolean;
}

type RawClass = { name: string; tier: string; weaponTypes: string[]; movement: number; ability: string; promotesTo: string[] };
type RawWeapon = { name: string; type: string; rank: string; might: number; hit: number; critical: number; weight: number; minRange: number; maxRange: number; uses: number };

const classCatalog = classesDocument.classes as Record<string, RawClass>;
const weaponCatalog = weaponsDocument.weapons as Record<string, RawWeapon>;

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

	return {
		id: document.id,
		name: document.name,
		faction: document.faction,
		className: unitClass.id,
		classLabel: unitClass.name,
		level: document.level,
		movement: unitClass.movement,
		weaponTypes: [...unitClass.weaponTypes],
		stats,
		growths: assertStats(document.growths, `Unit "${document.id}"`),
		maxStats: assertStats(document.maxStats, `Unit "${document.id}"`),
		currentHP: stats.hp,
		weapon,
		hasMoved: false
	};
}
