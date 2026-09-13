import { getTerrainProperties, TerrainType } from "@/game/map/model/Terrain";
import { UnitData, WeaponData, WeaponType } from "@/game/units/model/UnitData";

/**
 * The Fire Emblem: Radiant Dawn combat formulas, as pure functions on resolved
 * `UnitData` / `WeaponData`. No RNG, no components - a system, a feature or a
 * test calls these directly, the same way `MovementSystem` is used.
 *
 * Sources: the Tellius battle model (FE9/FE10). Terrain adds to Defence/Res and
 * Avoid; biorhythm, supports and skills are not modelled yet.
 */

/** Each key beats its value on the weapon triangle. Bows, knives and gauntlets stand outside it. */
const TRIANGLE_BEATS: Partial<Record<WeaponType, WeaponType>> = {
	[WeaponType.SWORD]: WeaponType.AXE,
	[WeaponType.AXE]: WeaponType.LANCE,
	[WeaponType.LANCE]: WeaponType.SWORD
};

/** Weapon types that strike with Magic and are resisted by Resistance. Empty until tomes exist. */
const MAGIC_WEAPON_TYPES = new Set<WeaponType>();

/** Weapon-triangle bonus: advantage adds it to Might and Hit, disadvantage subtracts it. */
export const TRIANGLE_MIGHT = 1;
export const TRIANGLE_HIT = 10;
/** This much more Attack Speed than the opponent and you land a follow-up strike. */
export const DOUBLE_THRESHOLD = 4;
/** A landed critical multiplies the damage of that strike by this. */
export const CRIT_MULTIPLIER = 3;

export type TriangleRelation = "advantage" | "disadvantage" | "neutral";

/** How `attacker`'s weapon type fares against `defender`'s on the triangle. */
export function weaponTriangle(attacker: WeaponType, defender: WeaponType): TriangleRelation {
	if (TRIANGLE_BEATS[attacker] === defender) {
		return "advantage";
	}

	if (TRIANGLE_BEATS[defender] === attacker) {
		return "disadvantage";
	}

	return "neutral";
}

/** Whether a weapon draws on Magic / Resistance rather than Strength / Defence. */
export function isMagicWeapon(weapon: WeaponData): boolean {
	return MAGIC_WEAPON_TYPES.has(weapon.type);
}

/**
 * Speed after the weapon's weight, past what the wielder's Strength can carry,
 * drags it down: `Spd - max(0, Wt - Str)`. A `null` weapon has no weight.
 */
export function attackSpeed(unit: UnitData, weapon: WeaponData | null): number {
	const burden = weapon === null ? 0 : Math.max(0, weapon.weight - unit.stats.strength);
	return unit.stats.speed - burden;
}

/** Attack Power: `(Str or Mag) + Might + triangle bonus`. */
export function attackPower(unit: UnitData, weapon: WeaponData, relation: TriangleRelation): number {
	const base = isMagicWeapon(weapon) ? unit.stats.magic : unit.stats.strength;
	const triangle = relation === "advantage" ? TRIANGLE_MIGHT : relation === "disadvantage" ? -TRIANGLE_MIGHT : 0;

	return base + weapon.might + triangle;
}

/** The mitigating stat: Resistance for magic weapons, Defence otherwise, plus terrain. */
export function defenseAgainst(unit: UnitData, weapon: WeaponData, terrain: TerrainType): number {
	const base = isMagicWeapon(weapon) ? unit.stats.resistance : unit.stats.defense;
	return base + getTerrainProperties(terrain).defense;
}

/** Damage a single connecting hit deals, floored at 0 (before any critical multiplier). */
export function damagePerHit(attacker: UnitData, weapon: WeaponData, defender: UnitData, defenderTerrain: TerrainType, relation: TriangleRelation): number {
	return Math.max(0, attackPower(attacker, weapon, relation) - defenseAgainst(defender, weapon, defenderTerrain));
}

/** Accuracy: `Weapon Hit + Dex×2 + floor(Luck/2) + triangle bonus`. */
export function hitRate(unit: UnitData, weapon: WeaponData, relation: TriangleRelation): number {
	const triangle = relation === "advantage" ? TRIANGLE_HIT : relation === "disadvantage" ? -TRIANGLE_HIT : 0;
	return weapon.hit + unit.stats.dexterity * 2 + Math.floor(unit.stats.luck / 2) + triangle;
}

/** Avoid: `Attack Speed×2 + Luck + terrain avoid`. */
export function avoidRate(unit: UnitData, weapon: WeaponData | null, terrain: TerrainType): number {
	return attackSpeed(unit, weapon) * 2 + unit.stats.luck + getTerrainProperties(terrain).avoid;
}

/** Critical rate: `Weapon Critical + floor(Dex/2)`. */
export function critRate(unit: UnitData, weapon: WeaponData): number {
	return weapon.critical + Math.floor(unit.stats.dexterity / 2);
}

/** Critical evade: the target's Luck. */
export function critAvoid(unit: UnitData): number {
	return unit.stats.luck;
}

function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, value));
}

/** Everything one attacker's swing does to one defender - the displayed numbers, no rolls yet. */
export interface Strike {
	/** Damage a normal hit deals. */
	damage: number;
	/** Displayed hit chance, 0-100. */
	hit: number;
	/** Displayed critical chance, 0-100. */
	crit: number;
	/** Where `attacker`'s weapon stands against `defender`'s. */
	relation: TriangleRelation;
}

export interface StrikeInputs {
	attacker: UnitData;
	attackerWeapon: WeaponData;
	defender: UnitData;
	/** The defender's readied weapon, for the triangle and their Attack Speed - `null` when unarmed. */
	defenderWeapon: WeaponData | null;
	/** Terrain the defender stands on. */
	defenderTerrain: TerrainType;
}

/** The displayed damage / hit / crit for one weapon against one target. */
export function computeStrike(input: StrikeInputs): Strike {
	const relation = input.defenderWeapon === null ? "neutral" : weaponTriangle(input.attackerWeapon.type, input.defenderWeapon.type);

	const damage = damagePerHit(input.attacker, input.attackerWeapon, input.defender, input.defenderTerrain, relation);
	const hit = clampPercent(hitRate(input.attacker, input.attackerWeapon, relation) - avoidRate(input.defender, input.defenderWeapon, input.defenderTerrain));
	const crit = clampPercent(critRate(input.attacker, input.attackerWeapon) - critAvoid(input.defender));

	return { damage, hit, crit, relation };
}

/** Whether `unit` (with `weapon`) strikes twice against an opponent whose Attack Speed is `opponentSpeed`. */
export function doublesAt(unit: UnitData, weapon: WeaponData | null, opponentSpeed: number): boolean {
	return attackSpeed(unit, weapon) - opponentSpeed >= DOUBLE_THRESHOLD;
}

/** Whether `range` puts a target inside `[minRange, maxRange]`. */
export function weaponReaches(weapon: WeaponData, range: number): boolean {
	return range >= weapon.minRange && range <= weapon.maxRange;
}
