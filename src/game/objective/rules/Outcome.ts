import { Entity } from "@/core/ecs/Entity";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { ObjectiveComponent, ObjectiveData, Outcome } from "@/game/objective/components/ObjectiveComponent";
import { WinCondition } from "@/game/objective/content/Objectives";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsOfFaction } from "@/game/units/rules/UnitLookup";

/*
 * Whether the battle is over, read off the units still on the map. Pure - no
 * queries, no World - so the flow asks after every death and a test asks
 * directly.
 */

/**
 * How the battle stands with these units on the map: lost when the commander
 * has fallen or nobody is left, won when the objective is met - a rout once
 * the last enemy is gone - and undecided ("") otherwise. Losing is checked
 * first: a battle cannot be won by an army that is no more. A seize is never
 * decided here - it is claimed with the "Seize" command, see [[canSeize]].
 */
export function battleOutcome(objective: ObjectiveData, units: readonly Entity[]): Outcome | "" {
	const players = unitsOfFaction(units, UnitFaction.PLAYER);

	if (players.length === 0 || !players.some((unit) => unit.getComponent(UnitComponent).read().commander)) {
		return Outcome.DEFEAT;
	}

	if (objective.win === WinCondition.ROUT && unitsOfFaction(units, UnitFaction.ENEMY).length === 0) {
		return Outcome.VICTORY;
	}

	return "";
}

/**
 * Whether `unit` can claim the objective from where it stands: the battle is
 * a seize still being fought, the unit is the army's commander, and it is on
 * the tile. Anyone else standing there is just standing there.
 */
export function canSeize(objective: ObjectiveData, unit: Entity): boolean {
	if (ObjectiveComponent.isDecided(objective)) {
		return false;
	}

	const data = unit.getComponent(UnitComponent).read();

	return data.faction === UnitFaction.PLAYER && data.commander && ObjectiveComponent.isSeizeTile(objective, unit.getComponent(GridPositionComponent).read());
}
