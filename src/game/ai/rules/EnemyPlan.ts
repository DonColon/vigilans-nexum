import { EnemyBehaviour } from "@/game/ai/content/Behaviours";
import { BattleForecast } from "@/game/combat/rules/BattleForecast";
import { forecastBattle, weaponsReaching } from "@/game/combat/rules/Targeting";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { getTerrainProperties } from "@/game/map/content/Terrain";
import { blockedTiles, movementPath, occupiedTiles, ReachableTile, reachableTiles, tileKey } from "@/game/movement/rules/Pathfinding";
import { UnitData } from "@/game/units/components/UnitComponent";
import { UnitLocation } from "@/game/units/rules/UnitLookup";

/*
 * What an enemy unit does with its action, worked out the same pure way the
 * pathfinding and the forecast are - no queries, no World - so the enemy
 * phase, and a test, can ask for a plan and get one back.
 *
 * The plan is a place to stand and, when someone is in reach from it, who to
 * strike and with what. It is made from the very numbers the player sees: the
 * tiles are the movement rules' flood fill, the reach is the targeting rules'
 * and the odds are the battle forecast's, so an enemy never does anything the
 * range overlay did not warn of.
 */

/** A unit as the planning needs it: its sheet and the tile it stands on. */
export interface PlanUnit {
	data: UnitData;
	tile: GridPositionData;
}

/** What an enemy unit will do this phase. */
export interface EnemyPlan {
	/** Its route, from where it stands to where it acts from, both included - a single tile when it stays put. */
	path: GridPositionData[];
	/** Id of the unit it strikes at from the end of the route, or "" when nobody is in reach. */
	targetId: string;
	/** Id of the pack entry it strikes with, or "" when it does not strike. */
	weaponId: string;
}

/**
 * The weights an attack is judged by - see [[scoreAttack]]. The damage is
 * read as a share of the HP on either side, 0 to 1, so finishing a wounded
 * unit counts for as much as felling a healthy one would and a scratch on a
 * tank counts for little; a likely kill is worth a bonus on top of it, and
 * good ground breaks the ties.
 */
export const ATTACK_WEIGHTS = {
	/** Per share of the target's HP the strikes expect to take. */
	dealt: 10,
	/** Per share of the attacker's own HP the counter expects to take. */
	taken: 6,
	/** When the strikes would fell the target outright, scaled by the odds of landing them. */
	kill: 5,
	/** Per point of Defence the ground it strikes from grants. */
	terrainDefense: 0.5,
	/** Per point of Avoid the ground grants. */
	terrainAvoid: 0.05
} as const;

/** A reachable tile as a plain position - the shape the reach checks and the forecast take. */
function positionOf(tile: ReachableTile): GridPositionData {
	return { column: tile.column, row: tile.row };
}

/** Movement budget that reaches every tile of any map - for measuring how far away somebody is. */
const FAR = 10_000;

/**
 * How good `forecast` is for the attacker: the share of the target's HP it
 * expects to take against the share of its own it expects to lose to the
 * counter, a bonus when its strikes would fell the target outright, and a
 * little for the ground it stands on. Expected values, not rolls - the enemy
 * plays the odds.
 */
export function scoreAttack(forecast: BattleForecast, grid: GridData, from: GridPositionData): number {
	const { attacker, defender } = forecast;

	const dealt = (Math.min(defender.hp, attacker.damage * attacker.attacks) / Math.max(1, defender.hp)) * (attacker.hit / 100);
	const taken = (Math.min(attacker.hp, defender.damage * defender.attacks) / Math.max(1, attacker.hp)) * (defender.hit / 100);
	const kill = attacker.damage * attacker.attacks >= defender.hp ? attacker.hit / 100 : 0;

	const terrain = GridComponent.terrainAt(grid, from.column, from.row);
	const ground = terrain === null ? 0 : getTerrainProperties(terrain).defense * ATTACK_WEIGHTS.terrainDefense + getTerrainProperties(terrain).avoid * ATTACK_WEIGHTS.terrainAvoid;

	return dealt * ATTACK_WEIGHTS.dealt - taken * ATTACK_WEIGHTS.taken + kill * ATTACK_WEIGHTS.kill + ground;
}

interface Attack {
	from: ReachableTile;
	targetId: string;
	weaponId: string;
	score: number;
}

/**
 * The best strike `enemy` can make from any of `standable`: every tile, every
 * target and every weapon that reaches it, judged by [[scoreAttack]]. Ties go
 * to the tile that costs less movement to reach. Null when nobody is in reach.
 */
function bestAttack(grid: GridData, enemy: PlanUnit, standable: readonly ReachableTile[], targets: readonly PlanUnit[]): Attack | null {
	let best: Attack | null = null;

	for (const stand of standable) {
		for (const target of targets) {
			const from = positionOf(stand);
			const distance = GridPositionComponent.distance(from, target.tile);

			for (const entry of weaponsReaching(enemy.data, distance)) {
				if (entry.weapon === null) {
					continue;
				}

				const forecast = forecastBattle(enemy.data, from, entry.weapon, target.data, target.tile, grid);
				const score = scoreAttack(forecast, grid, from);

				if (best === null || score > best.score || (score === best.score && stand.cost < best.from.cost)) {
					best = { from: stand, targetId: target.data.id, weaponId: entry.id, score };
				}
			}
		}
	}

	return best;
}

/**
 * The tile among `standable` nearest any of `targets` by walking distance -
 * the flood fill run backwards from each target, over the same blockers the
 * enemy faces - or null when no target can be walked towards at all. Ties go
 * to the tile that costs less to reach.
 */
function closestApproach(grid: GridData, standable: readonly ReachableTile[], targets: readonly PlanUnit[], blocked: ReadonlySet<string>): ReachableTile | null {
	const remaining = new Map<string, number>();

	for (const target of targets) {
		for (const tile of reachableTiles(grid, target.tile, FAR, blocked)) {
			const key = tileKey(tile.column, tile.row);
			remaining.set(key, Math.min(remaining.get(key) ?? Infinity, tile.cost));
		}
	}

	let best: ReachableTile | null = null;
	let bestRemaining = Infinity;

	for (const tile of standable) {
		const left = remaining.get(tileKey(tile.column, tile.row));

		if (left === undefined) {
			continue;
		}

		if (left < bestRemaining || (left === bestRemaining && best !== null && tile.cost < best.cost)) {
			best = tile;
			bestRemaining = left;
		}
	}

	return best;
}

/**
 * Plans `enemy`'s action: `units` is everyone on the map (the enemy itself
 * included - it is told apart by id), `targets` the units it may strike.
 *
 *  - Whatever its behaviour, it strikes when it can: the best attack from any
 *    tile it may stand on, by [[scoreAttack]].
 *  - A `charge` unit with nobody in reach walks as far towards the nearest
 *    target as it can; a `hold` unit never leaves its tile.
 *  - With nobody to walk towards either, it stays put.
 */
export function planEnemyAction(grid: GridData, enemy: PlanUnit, behaviour: EnemyBehaviour, units: readonly UnitLocation[], targets: readonly PlanUnit[]): EnemyPlan {
	const blocked = blockedTiles(units, enemy.data);
	const occupied = occupiedTiles(units, enemy.data.id);
	const stay: ReachableTile = { column: enemy.tile.column, row: enemy.tile.row, cost: 0 };

	const standable = behaviour === EnemyBehaviour.HOLD ? [stay] : reachableTiles(grid, enemy.tile, enemy.data.stats.movement, blocked, occupied);
	const attack = bestAttack(grid, enemy, standable, targets);

	if (attack !== null) {
		return { path: routeTo(grid, enemy, positionOf(attack.from), blocked), targetId: attack.targetId, weaponId: attack.weaponId };
	}

	const approach = behaviour === EnemyBehaviour.CHARGE ? closestApproach(grid, standable, targets, blocked) : null;

	return { path: routeTo(grid, enemy, positionOf(approach ?? stay), blocked), targetId: "", weaponId: "" };
}

/** The route from where the enemy stands to `to`, both ends included; just the one tile when it stays. */
function routeTo(grid: GridData, enemy: PlanUnit, to: GridPositionData, blocked: ReadonlySet<string>): GridPositionData[] {
	if (to.column === enemy.tile.column && to.row === enemy.tile.row) {
		return [{ column: to.column, row: to.row }];
	}

	const route = movementPath(grid, enemy.tile, to, enemy.data.stats.movement, blocked);

	return route.length >= 2 ? route : [{ ...enemy.tile }, { column: to.column, row: to.row }];
}
