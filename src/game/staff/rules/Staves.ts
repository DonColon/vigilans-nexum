import { Entity } from "@/core/ecs/Entity";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { weaponReaches } from "@/game/combat/rules/CombatMath";
import { WeaponData } from "@/game/units/content/UnitCatalog";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { tileOf } from "@/game/units/rules/UnitLookup";

/** One ally a staff could be raised over, and how far away it stands. */
export interface StaffTarget {
	unit: Entity;
	distance: number;
}

/*
 * Pure lookups for Fire Emblem's "Staff": who a healer can reach from where.
 * Everything here works on data a caller already holds, so the move flow, the
 * heal feature and a test all call it directly. Which staves a unit carries at
 * all is the unit's own business - `UnitComponent.staves`.
 *
 * A staff is a weapon the unit's class trains in - it sits in the pack beside
 * the swords - but it reaches allies rather than enemies, and only wounded ones
 * are worth reaching.
 */

/**
 * HP `staff` in `healer`'s hands would put back on `target` right now: the
 * staff's might plus the healer's magic, clamped to the wound. Zero for a
 * target at full health.
 */
export function healingBy(healer: UnitData, staff: WeaponData, target: UnitData): number {
	const missing = Math.max(0, target.stats.hp - target.currentHP);

	return Math.min(missing, Math.max(0, staff.might + healer.stats.magic));
}

/**
 * Every wounded ally `staff` reaches from `from`, nearest first - the units
 * the heal choice steps the map cursor through. `unit` itself is never one of
 * them: a staff is raised over someone else.
 */
export function staffTargetsOf(unit: UnitData, from: GridPositionData, staff: WeaponData, allies: readonly Entity[]): StaffTarget[] {
	return allies
		.filter((ally) => {
			const data = ally.getComponent(UnitComponent).read();
			return data.id !== unit.id && data.faction === unit.faction && data.currentHP < data.stats.hp;
		})
		.map((ally) => ({ unit: ally, distance: GridPositionComponent.distance(from, tileOf(ally)) }))
		.filter(({ distance }) => weaponReaches(staff, distance))
		.sort((first, second) => first.distance - second.distance);
}

/**
 * Whether `unit` could raise any staff it carries over any wounded ally from
 * `from` - what puts "Staff" on the command menu.
 */
export function canUseStaff(unit: UnitData, from: GridPositionData, allies: readonly Entity[]): boolean {
	return UnitComponent.staves(unit).some((entry) => entry.weapon !== null && staffTargetsOf(unit, from, entry.weapon, allies).length > 0);
}
