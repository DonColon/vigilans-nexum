import { GridData, GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { Terrain } from "@/game/map/content/Terrain";
import { InventoryEntry, InventoryKind, UnitData } from "@/game/units/components/UnitComponent";
import { isStaff, WeaponData } from "@/game/units/content/UnitCatalog";
import { weaponReaches } from "@/game/combat/rules/CombatMath";
import { BattleForecast, buildForecast } from "@/game/combat/rules/BattleForecast";

/*
 * Who a unit can strike from where: the reach checks over two units and the
 * grid that the attack command, the forecast and the enemy range share. No
 * World, no queries, so a feature, a system or a test calls them directly.
 */

/**
 * The weapons `unit` carries that it can wield and that reach a target
 * `range` tiles away - the choices offered in a forecast, readied one first.
 * A staff is never one of them: it reaches allies, not enemies.
 */
export function weaponsReaching(unit: UnitData, range: number): InventoryEntry[] {
	const reaching = unit.inventory.filter((entry) => entry.kind === InventoryKind.WEAPON && entry.equippable && entry.weapon !== null && !isStaff(entry.weapon) && weaponReaches(entry.weapon, range));

	return reaching.sort((first, second) => Number(second.equipped) - Number(first.equipped));
}

/** Whether `unit` could strike any of `targets` with something in its pack from `from`. */
export function canReachAny(unit: UnitData, from: GridPositionData, targets: readonly GridPositionData[]): boolean {
	return targets.some((target) => weaponsReaching(unit, GridPositionComponent.distance(from, target)).length > 0);
}

/**
 * The `candidates` `attacker` could strike from `from` with something in its
 * pack, nearest first - the targets the battle forecast cycles the cursor
 * through. `tile` picks each candidate's position.
 */
export function targetsInReach<T>(attacker: UnitData, from: GridPositionData, candidates: readonly T[], tile: (candidate: T) => GridPositionData): T[] {
	return candidates
		.map((candidate) => ({ candidate, distance: GridPositionComponent.distance(from, tile(candidate)) }))
		.filter(({ distance }) => weaponsReaching(attacker, distance).length > 0)
		.sort((first, second) => first.distance - second.distance)
		.map(({ candidate }) => candidate);
}

/** Builds the forecast for `attacker` swinging `weapon` at `defender`, reading terrain off the grid. */
export function forecastBattle(attacker: UnitData, attackerTile: GridPositionData, weapon: WeaponData, defender: UnitData, defenderTile: GridPositionData, grid: GridData): BattleForecast {
	return buildForecast({
		attacker,
		attackerWeapon: weapon,
		attackerTerrain: GridComponent.terrainAt(grid, attackerTile.column, attackerTile.row) ?? Terrain.PLAIN,
		defender,
		defenderTerrain: GridComponent.terrainAt(grid, defenderTile.column, defenderTile.row) ?? Terrain.PLAIN,
		distance: GridPositionComponent.distance(attackerTile, defenderTile)
	});
}
