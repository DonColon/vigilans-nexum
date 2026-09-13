import { rollChance } from "@/core/math/generation/Randomizer";
import { ClassTier, LEVEL_UP_EXPERIENCE, MAX_LEVEL, NO_BOOST, STAT_NAMES, StatBoost, UnitData, UnitStats, WeaponData } from "@/game/units/model/UnitData";

/**
 * The Fire Emblem: Radiant Dawn experience formulas, Normal mode, as pure
 * functions on resolved `UnitData` - the same shape as `CombatMath`. Laguz,
 * the Steal skill's thief bonus and the difficulty modes are not modelled: a
 * unit here is a beorc on Normal.
 *
 * Source: the Tellius experience tables (Fire Emblem Wiki, "Experience").
 */

/** Normal mode's base for the damage formula: `(21 + level difference) / 2`. */
export const DAMAGE_BASE = 21;
/** Added to every kill on Normal mode. */
export const KILL_BONUS = 15;
/** Added to a kill when the fallen unit was a boss. */
export const BOSS_BONUS = 40;
/** What a swing that never lands - a miss, or a hit for nothing - is still worth. */
export const NO_DAMAGE_EXPERIENCE = 1;
/** The most a single fight can be worth. */
export const MAX_COMBAT_EXPERIENCE = 100;

/** What a level is worth by class tier: a second-tier level 1 weighs like a base-class level 21. */
const PROMOTION_BONUS: Record<ClassTier, number> = { base: 0, second: 20, third: 40 };

/** Normal mode's kill class bonus: 5 for an unpromoted beorc, 10 for a promoted one. */
const CLASS_BONUS: Record<ClassTier, number> = { base: 5, second: 10, third: 10 };

/** A unit's level weighted by its class tier - what the formulas compare. */
export function effectiveLevel(unit: UnitData): number {
	return unit.level + PROMOTION_BONUS[unit.classTier];
}

/**
 * Experience for hurting an opponent without felling them:
 * `(21 + enemy level - player level) / 2`, rounded down, never below 1.
 */
export function damageExperience(unit: UnitData, opponent: UnitData): number {
	return Math.max(1, Math.floor((DAMAGE_BASE + effectiveLevel(opponent) - effectiveLevel(unit)) / 2));
}

/**
 * Experience for felling an opponent: the damage experience plus the level
 * difference again, the class bonus difference, the mode's 15 and 40 more for
 * a boss. Never less than the damage experience, never more than 100.
 */
export function killExperience(unit: UnitData, opponent: UnitData): number {
	const damage = damageExperience(unit, opponent);
	const levels = effectiveLevel(opponent) - effectiveLevel(unit);
	const classes = CLASS_BONUS[opponent.classTier] - CLASS_BONUS[unit.classTier];
	const boss = opponent.boss ? BOSS_BONUS : 0;

	return Math.min(MAX_COMBAT_EXPERIENCE, Math.max(damage, damage + levels + classes + KILL_BONUS + boss));
}

/** What one side did to the other over a fight, as far as experience cares. */
export interface CombatShare {
	/** At least one of the unit's strikes took HP off the opponent. */
	dealtDamage: boolean;
	/** The opponent was at 0 HP when the fight ended. */
	felled: boolean;
}

/**
 * What a fight is worth to one of its sides: the kill, the damage, or the
 * single point for having swung at all. A unit that never swung - a defender
 * with no weapon in reach - earns nothing.
 */
export function combatExperience(unit: UnitData, opponent: UnitData, share: CombatShare, swung: boolean): number {
	if (!swung) {
		return 0;
	}

	if (share.felled) {
		return killExperience(unit, opponent);
	}

	return share.dealtDamage ? damageExperience(unit, opponent) : NO_DAMAGE_EXPERIENCE;
}

/** What raising a staff is worth: the staff's own value - Heal 11, Mend 12. */
export function staffExperience(staff: WeaponData): number {
	return staff.experience;
}

/** A pass/fail roll against a growth percentage - injectable so a test can force a level. */
export type GrowthRoll = (percent: number) => boolean;

/**
 * One level gained: which level the unit reached and what each stat rose by.
 * Every stat is listed, zero where the roll failed or the cap was reached.
 */
export interface LevelUp {
	level: number;
	gains: StatBoost;
}

/** A unit after experience landed on it, with what there is to show for it. */
export interface ExperienceGain {
	unit: UnitData;
	/** Points actually added - clipped at the top of the ladder. */
	gained: number;
	/** The level, if one was reached. A single fight is worth at most one. */
	levelUp: LevelUp | null;
}

/**
 * Rolls one level's worth of stat growth: every stat with a growth rate gets a
 * point for each full hundred of it and one more on a roll under the rest,
 * clipped at the sheet's cap. Movement rolls like the rest - its growth is
 * simply zero on every sheet so far.
 */
export function rollGrowths(unit: UnitData, roll: GrowthRoll = rollChance): StatBoost {
	const gains: StatBoost = { ...NO_BOOST };

	for (const stat of STAT_NAMES) {
		const growth = unit.growths[stat];
		const remainder = growth % 100;
		const rolled = Math.floor(growth / 100) + (remainder > 0 && roll(remainder) ? 1 : 0);

		gains[stat] = Math.max(0, Math.min(rolled, unit.maxStats[stat] - unit.stats[stat]));
	}

	return gains;
}

/**
 * Adds `amount` experience to a unit. Reaching 100 levels it up: the count
 * wraps, the level climbs and the growths are rolled; a raised HP maximum lifts
 * the current HP with it. A unit at the top of its ladder holds at 99 - it has
 * nowhere to go until it promotes. Pure: returns a new unit, the source is
 * untouched.
 */
export function gainExperience(unit: UnitData, amount: number, roll: GrowthRoll = rollChance): ExperienceGain {
	if (amount <= 0) {
		return { unit, gained: 0, levelUp: null };
	}

	if (unit.level >= MAX_LEVEL) {
		const held = Math.min(LEVEL_UP_EXPERIENCE - 1, unit.experience + amount);

		return { unit: { ...unit, experience: held }, gained: held - unit.experience, levelUp: null };
	}

	const total = unit.experience + amount;

	if (total < LEVEL_UP_EXPERIENCE) {
		return { unit: { ...unit, experience: total }, gained: amount, levelUp: null };
	}

	const gains = rollGrowths(unit, roll);
	const stats: UnitStats = { ...unit.stats };

	for (const stat of STAT_NAMES) {
		stats[stat] += gains[stat];
	}

	const level = unit.level + 1;
	const experience = total - LEVEL_UP_EXPERIENCE;

	return {
		unit: { ...unit, level, experience, stats, currentHP: unit.currentHP + gains.hp },
		gained: amount,
		levelUp: { level, gains }
	};
}
