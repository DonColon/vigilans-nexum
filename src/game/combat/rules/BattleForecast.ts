import { rollChance, rollChanceAveraged } from "@/core/math/generation/Randomizer";
import { TerrainType } from "@/game/map/model/Terrain";
import { isStaff, UnitData, UnitFaction, WeaponData } from "@/game/units/model/UnitData";
import { attackSpeed, computeStrike, CRIT_MULTIPLIER, doublesAt, weaponReaches } from "@/game/combat/model/CombatMath";

/** One side of a battle forecast - the numbers Fire Emblem shows before you commit. */
export interface CombatantForecast {
	unitId: string;
	name: string;
	/** Whose side this combatant fights on - the forecast tints its column by it. */
	faction: UnitFaction;
	/** Name of the weapon this side fights with, or "" when it has none / cannot reach. */
	weaponName: string;
	hp: number;
	maxHp: number;
	/** Damage a single connecting hit deals. */
	damage: number;
	/** Displayed hit chance, 0-100. */
	hit: number;
	/** Displayed critical chance, 0-100. */
	crit: number;
	/** 0 = cannot strike (out of range / unarmed), 1 = one strike, 2 = follows up. */
	attacks: number;
}

/** The full forecast for an attack: the initiator and the target it would counter with. */
export interface BattleForecast {
	attacker: CombatantForecast;
	defender: CombatantForecast;
	/** Manhattan tiles between the two. */
	distance: number;
}

export interface ForecastInputs {
	attacker: UnitData;
	/** The weapon the attacker would fight with (the one being previewed, not necessarily equipped). */
	attackerWeapon: WeaponData;
	attackerTerrain: TerrainType;
	defender: UnitData;
	defenderTerrain: TerrainType;
	distance: number;
}

/**
 * Builds the forecast for `attacker` swinging `attackerWeapon` at `defender`
 * `distance` tiles away. The attacker is assumed to be in range (the caller
 * only offers weapons that reach); the defender counters only when its readied
 * weapon covers the distance.
 */
export function buildForecast(input: ForecastInputs): BattleForecast {
	const { attacker, attackerWeapon, defender, distance } = input;
	// A readied staff is no weapon to counter with - a healer caught in reach just takes the hit.
	const defenderWeapon = defender.weapon !== null && isStaff(defender.weapon) ? null : defender.weapon;
	const defenderCanCounter = defenderWeapon !== null && weaponReaches(defenderWeapon, distance);

	const attackerStrike = computeStrike({
		attacker,
		attackerWeapon,
		defender,
		defenderWeapon,
		defenderTerrain: input.defenderTerrain
	});

	const attackerSpeed = attackSpeed(attacker, attackerWeapon);
	const defenderSpeed = attackSpeed(defender, defenderWeapon);

	const attackerForecast: CombatantForecast = {
		unitId: attacker.id,
		name: attacker.name,
		faction: attacker.faction,
		weaponName: attackerWeapon.name,
		hp: attacker.currentHP,
		maxHp: attacker.stats.hp,
		damage: attackerStrike.damage,
		hit: attackerStrike.hit,
		crit: attackerStrike.crit,
		attacks: doublesAt(attacker, attackerWeapon, defenderSpeed) ? 2 : 1
	};

	if (!defenderCanCounter) {
		return {
			attacker: attackerForecast,
			distance,
			defender: {
				unitId: defender.id,
				name: defender.name,
				faction: defender.faction,
				weaponName: "",
				hp: defender.currentHP,
				maxHp: defender.stats.hp,
				damage: 0,
				hit: 0,
				crit: 0,
				attacks: 0
			}
		};
	}

	const counterStrike = computeStrike({
		attacker: defender,
		attackerWeapon: defenderWeapon,
		defender: attacker,
		defenderWeapon: attackerWeapon,
		defenderTerrain: input.attackerTerrain
	});

	return {
		attacker: attackerForecast,
		distance,
		defender: {
			unitId: defender.id,
			name: defender.name,
			faction: defender.faction,
			weaponName: defenderWeapon.name,
			hp: defender.currentHP,
			maxHp: defender.stats.hp,
			damage: counterStrike.damage,
			hit: counterStrike.hit,
			crit: counterStrike.crit,
			attacks: doublesAt(defender, defenderWeapon, attackerSpeed) ? 2 : 1
		}
	};
}

/** Which side swung. */
export type StrikeSide = "attacker" | "defender";

/** One resolved swing of a fight. */
export interface ResolvedStrike {
	side: StrikeSide;
	/** The hit connected. */
	connected: boolean;
	/** It was a critical (only meaningful when `connected`). */
	critical: boolean;
	/** HP taken off the target (0 on a miss). */
	damage: number;
	/** The target's HP once this strike lands. */
	targetHp: number;
}

export interface CombatOutcome {
	strikes: ResolvedStrike[];
	attackerHp: number;
	defenderHp: number;
	attackerDefeated: boolean;
	defenderDefeated: boolean;
	/** Times each side actually swung - a weapon use is spent per swing, hit or miss. */
	attackerSwings: number;
	defenderSwings: number;
}

/** Injectable rolls, so a test can force outcomes. Both take a 0-100 chance. */
export interface CombatRolls {
	hit(chance: number): boolean;
	crit(chance: number): boolean;
}

/** Fire Emblem's real rolls: 2RN for accuracy, 1RN for criticals. */
export const DEFAULT_COMBAT_ROLLS: CombatRolls = {
	hit: (chance) => rollChanceAveraged(chance),
	crit: (chance) => rollChance(chance)
};

/**
 * Plays out the forecast into an actual result: attacker strikes, defender
 * counters, then follow-ups, stopping the moment either side is defeated. HP
 * changes are returned, not applied - the caller writes them back.
 */
export function resolveCombat(forecast: BattleForecast, rolls: CombatRolls = DEFAULT_COMBAT_ROLLS): CombatOutcome {
	let attackerHp = forecast.attacker.hp;
	let defenderHp = forecast.defender.hp;
	let attackerSwings = 0;
	let defenderSwings = 0;

	const strikes: ResolvedStrike[] = [];

	// attacker first, defender counters, then whichever follow-ups the forecast grants.
	const order: StrikeSide[] = ["attacker", "defender"];

	if (forecast.attacker.attacks >= 2) {
		order.push("attacker");
	}

	if (forecast.defender.attacks >= 2) {
		order.push("defender");
	}

	for (const side of order) {
		if (attackerHp <= 0 || defenderHp <= 0) {
			break;
		}

		const source = side === "attacker" ? forecast.attacker : forecast.defender;

		if (source.attacks < 1) {
			continue;
		}

		if (side === "attacker") {
			attackerSwings++;
		} else {
			defenderSwings++;
		}

		const connected = rolls.hit(source.hit);
		const critical = connected && rolls.crit(source.crit);
		const damage = connected ? source.damage * (critical ? CRIT_MULTIPLIER : 1) : 0;

		if (side === "attacker") {
			defenderHp = Math.max(0, defenderHp - damage);
		} else {
			attackerHp = Math.max(0, attackerHp - damage);
		}

		strikes.push({
			side,
			connected,
			critical,
			damage,
			targetHp: side === "attacker" ? defenderHp : attackerHp
		});
	}

	return {
		strikes,
		attackerHp,
		defenderHp,
		attackerDefeated: attackerHp <= 0,
		defenderDefeated: defenderHp <= 0,
		attackerSwings,
		defenderSwings
	};
}
