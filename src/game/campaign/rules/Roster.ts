import { Entity } from "@/core/ecs/Entity";
import { UnitComponent, UnitData, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsOfFaction } from "@/game/units/rules/UnitLookup";

/*
 * What a run carries from one chapter to the next, read off the units on the
 * map. Pure: the flow asks at the end of a won battle, a spec asks directly.
 */

/**
 * The player's units as the next chapter deploys them: every sheet as it
 * stands - level, stats, pack - but rested, with the wound closed and the turn
 * not yet spent. Units that fell are not on the map and so not in the roster.
 */
export function rosterOf(units: readonly Entity[]): UnitData[] {
	return unitsOfFaction(units, UnitFaction.PLAYER).map((unit) => rested(unit.getComponent(UnitComponent).read()));
}

/**
 * A saved sheet as a veteran is deployed with: rested, and with the readied
 * weapon pointed at the pack entry it mirrors again - a sheet that has been
 * through the store may come back with the two as separate copies.
 */
export function rested(unit: UnitData): UnitData {
	const inventory = unit.inventory.map((entry) => ({ ...entry }));
	const equipped = inventory.find((entry) => entry.equipped) ?? null;

	return { ...unit, currentHP: unit.stats.hp, hasMoved: false, inventory, weapon: equipped?.weapon ?? null };
}
