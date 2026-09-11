import { Entity } from "@/core/ecs/Entity";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { weaponReaches } from "@/game/combat/model/CombatMath";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { InventoryEntry, InventoryKind, isStaff, UnitData, WeaponData } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/** One ally a staff could be raised over, and how far away it stands. */
export interface StaffTarget {
	unit: Entity;
	distance: number;
}

/**
 * Pure lookups for Fire Emblem's "Staff", kept off the components the same way
 * `CombatSystem` keeps its reach maths: everything here works on data a caller
 * already holds, so the move flow, the heal feature and a test all call it
 * directly.
 *
 * A staff is a weapon the unit's class trains in - it sits in the pack beside
 * the swords - but it reaches allies rather than enemies, and only wounded ones
 * are worth reaching.
 */
export class StaffSystem {
	/** Manhattan tiles between two positions. */
	public static distance(a: GridPositionData, b: GridPositionData): number {
		return Math.abs(a.column - b.column) + Math.abs(a.row - b.row);
	}

	/**
	 * The staves `unit` carries and can raise: staff entries its class trains in,
	 * in pack order. A staff handed to a swordsman is dead weight and is not one
	 * of them.
	 */
	public static staves(unit: UnitData): InventoryEntry[] {
		return unit.inventory.filter((entry) => entry.kind === InventoryKind.WEAPON && entry.equippable && entry.weapon !== null && isStaff(entry.weapon));
	}

	/**
	 * HP `staff` in `healer`'s hands would put back on `target` right now: the
	 * staff's might plus the healer's magic, clamped to the wound. Zero for a
	 * target at full health.
	 */
	public static healingBy(healer: UnitData, staff: WeaponData, target: UnitData): number {
		const missing = Math.max(0, target.stats.hp - target.currentHP);

		return Math.min(missing, Math.max(0, staff.might + healer.stats.magic));
	}

	/**
	 * Every wounded ally `staff` reaches from `from`, nearest first - the units
	 * the heal choice steps the map cursor through. `unit` itself is never one of
	 * them: a staff is raised over someone else.
	 */
	public static targetsOf(unit: UnitData, from: GridPositionData, staff: WeaponData, allies: readonly Entity[]): StaffTarget[] {
		return allies
			.filter((ally) => {
				const data = ally.getComponent(UnitComponent).read();
				return data.id !== unit.id && data.faction === unit.faction && data.currentHP < data.stats.hp;
			})
			.map((ally) => ({ unit: ally, distance: StaffSystem.distance(from, UnitSystem.tileOf(ally)) }))
			.filter(({ distance }) => weaponReaches(staff, distance))
			.sort((first, second) => first.distance - second.distance);
	}

	/**
	 * Whether `unit` could raise any staff it carries over any wounded ally from
	 * `from` - what puts "Staff" on the command menu.
	 */
	public static canUseStaff(unit: UnitData, from: GridPositionData, allies: readonly Entity[]): boolean {
		return StaffSystem.staves(unit).some((entry) => entry.weapon !== null && StaffSystem.targetsOf(unit, from, entry.weapon, allies).length > 0);
	}
}
