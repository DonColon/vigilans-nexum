import { GridData } from "@/game/map/components/GridComponent";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { Terrain } from "@/game/map/model/Terrain";
import { InventoryEntry, InventoryKind, UnitData, WeaponData } from "@/game/units/model/UnitData";
import { weaponReaches } from "@/game/combat/model/CombatMath";
import { BattleForecast, buildForecast } from "@/game/combat/model/BattleForecast";

/**
 * Pure combat helpers over resolved `UnitData` and the grid, kept off the
 * components the same way `MovementSystem` is: no World, no queries, so a
 * feature, a system or a test calls them directly.
 */
export class CombatSystem {
	/** Manhattan tiles between two positions. */
	public static distance(a: GridPositionData, b: GridPositionData): number {
		return Math.abs(a.column - b.column) + Math.abs(a.row - b.row);
	}

	/**
	 * The weapons `unit` carries that it can wield and that reach a target
	 * `range` tiles away - the choices offered in a forecast, readied one first.
	 */
	public static weaponsReaching(unit: UnitData, range: number): InventoryEntry[] {
		const reaching = unit.inventory.filter((entry) => entry.kind === InventoryKind.WEAPON && entry.equippable && entry.weapon !== null && weaponReaches(entry.weapon, range));

		return reaching.sort((first, second) => Number(second.equipped) - Number(first.equipped));
	}

	/** Whether `unit` could strike any of `targets` with something in its pack from `from`. */
	public static canReachAny(unit: UnitData, from: GridPositionData, targets: readonly GridPositionData[]): boolean {
		return targets.some((target) => CombatSystem.weaponsReaching(unit, CombatSystem.distance(from, target)).length > 0);
	}

	/**
	 * The `candidates` `attacker` could strike from `from` with something in its
	 * pack, nearest first - the targets the battle forecast cycles the cursor
	 * through. `tile` picks each candidate's position.
	 */
	public static targetsInReach<T>(attacker: UnitData, from: GridPositionData, candidates: readonly T[], tile: (candidate: T) => GridPositionData): T[] {
		return candidates
			.map((candidate) => ({ candidate, distance: CombatSystem.distance(from, tile(candidate)) }))
			.filter(({ distance }) => CombatSystem.weaponsReaching(attacker, distance).length > 0)
			.sort((first, second) => first.distance - second.distance)
			.map(({ candidate }) => candidate);
	}

	/** Builds the forecast for `attacker` swinging `weapon` at `defender`, reading terrain off the grid. */
	public static forecast(attacker: UnitData, attackerTile: GridPositionData, weapon: WeaponData, defender: UnitData, defenderTile: GridPositionData, grid: GridData): BattleForecast {
		return buildForecast({
			attacker,
			attackerWeapon: weapon,
			attackerTerrain: GridSystem.getTerrain(grid, attackerTile.column, attackerTile.row) ?? Terrain.PLAIN,
			defender,
			defenderTerrain: GridSystem.getTerrain(grid, defenderTile.column, defenderTile.row) ?? Terrain.PLAIN,
			distance: CombatSystem.distance(attackerTile, defenderTile)
		});
	}
}
