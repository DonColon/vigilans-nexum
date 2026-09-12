import { GridData } from "@/game/map/components/GridComponent";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { InventoryKind, isStaff, UnitData, WeaponData } from "@/game/units/model/UnitData";
import { UnitLocation } from "@/game/units/systems/UnitSystem";

/** How far a unit can strike, in tiles - the window its weapons cover. */
export interface WeaponReach {
	minRange: number;
	maxRange: number;
}

/** One unit's threat, or several of them merged: where they walk and what that puts in reach. */
export interface ThreatRange {
	movement: GridPositionData[];
	attack: GridPositionData[];
}

/** A unit as the threat maths needs it: its sheet and the tile it stands on. */
export interface ThreatUnit {
	data: UnitData;
	tile: GridPositionData;
}

/**
 * What the other side covers, in the same pure form `MovementSystem` is kept
 * in: no queries, no World, so a feature, a system or a test can call it
 * directly.
 *
 * The range of one unit is exactly the range the player's own units get when
 * they are picked up - the same flood fill, the same terrain costs, the same
 * rule that nobody walks through anybody - which is the point: what the overlay
 * draws is what that unit could actually do on its turn. The only difference is
 * reach. A picked-up player unit shows the readied weapon, because that is what
 * it would swing right now; an enemy shows everything in its pack it can wield,
 * because on its turn it is free to switch, and a hand axe left unequipped
 * still makes the tile two away a dangerous place to stand.
 */
export class ThreatSystem {
	/**
	 * The window every weapon the unit can wield covers together, or null when it
	 * carries nothing it could swing. A sword and a hand axe come out as 1-2 -
	 * the union, not one weapon or the other. A staff threatens nobody, so a
	 * healer with nothing else in its pack has no reach at all.
	 */
	public static weaponReach(unit: UnitData): WeaponReach | null {
		const weapons = unit.inventory
			.filter((entry) => entry.kind === InventoryKind.WEAPON && entry.equippable)
			.map((entry) => entry.weapon)
			.filter((weapon): weapon is WeaponData => weapon !== null && !isStaff(weapon));

		// A unit built without a pack still has whatever it has readied.
		if (weapons.length === 0 && unit.weapon !== null && !isStaff(unit.weapon)) {
			weapons.push(unit.weapon);
		}

		if (weapons.length === 0) {
			return null;
		}

		return {
			minRange: Math.min(...weapons.map((weapon) => weapon.minRange)),
			maxRange: Math.max(...weapons.map((weapon) => weapon.maxRange))
		};
	}

	/**
	 * Everything one unit threatens from where it stands: the tiles it can move
	 * onto and the tiles it could strike from any of them. `others` are the units
	 * in its way - itself included, it is filtered out by id; its own side is
	 * walked through, the other side blocks.
	 */
	public static rangeOf(grid: GridData, unit: ThreatUnit, others: readonly UnitLocation[]): ThreatRange {
		const blocked = MovementSystem.blockedTiles(others, unit.data);
		const occupied = MovementSystem.occupiedTiles(others, unit.data.id);
		const reachable = MovementSystem.reachable(grid, unit.tile, unit.data.movement, blocked, occupied);
		const reach = ThreatSystem.weaponReach(unit.data);

		return {
			movement: reachable.map((tile) => ({ column: tile.column, row: tile.row })),
			attack: reach === null ? [] : MovementSystem.attackable(grid, reachable, reach.minRange, reach.maxRange)
		};
	}

	/**
	 * The same for a group, merged into one overlay: a tile several of them cover
	 * is listed once, and a tile that is somebody's step and somebody else's
	 * strike counts as a step - being stood on is the stronger claim, and drawing
	 * it twice would only darken the wash.
	 */
	public static rangeOfAll(grid: GridData, units: readonly ThreatUnit[], others: readonly UnitLocation[]): ThreatRange {
		const movement = new Map<string, GridPositionData>();
		const attack = new Map<string, GridPositionData>();

		for (const unit of units) {
			const range = ThreatSystem.rangeOf(grid, unit, others);

			for (const tile of range.movement) {
				movement.set(MovementSystem.tileKey(tile.column, tile.row), tile);
			}

			for (const tile of range.attack) {
				attack.set(MovementSystem.tileKey(tile.column, tile.row), tile);
			}
		}

		for (const key of movement.keys()) {
			attack.delete(key);
		}

		return { movement: [...movement.values()], attack: [...attack.values()] };
	}
}
