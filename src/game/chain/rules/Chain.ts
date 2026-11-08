import { Entity } from "@/core/ecs/Entity";
import { ChainComponent, ChainData } from "@/game/chain/components/ChainComponent";
import { weaponsReaching } from "@/game/combat/rules/Targeting";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { tileOf, unitById, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/*
 * Who can take part in a chain attack, read off the units on the map. Pure - the
 * command menu asks before it offers the row, and a test asks directly.
 */

/** The weapon `unit` would strike `target` with from where it stands, or null when nothing it carries reaches. */
export function chainWeapon(unit: Entity, target: Entity): string | null {
	const distance = GridPositionComponent.distance(tileOf(unit), tileOf(target));

	return weaponsReaching(unit.getComponent(UnitComponent).read(), distance)[0]?.id ?? null;
}

/**
 * Whether this unit could join a chain: it fights for the player, has not
 * attacked this turn and has a weapon that reaches the target. Having walked
 * into position and waited does not count against it - the formation has to be
 * built somehow.
 */
function canJoin(chain: ChainData, unit: Entity, target: Entity): boolean {
	const data = unit.getComponent(UnitComponent).read();

	return data.faction === UnitFaction.PLAYER && !chain.struck.includes(data.id) && chainWeapon(unit, target) !== null;
}

/**
 * The allies who could strike alongside `mover`, in deployment order. Empty when
 * no chain is on offer: the bar is not at its last point, one is already
 * running, the target is gone or `mover` itself cannot join.
 */
export function chainPartners(chain: ChainData, mover: Entity, units: readonly Entity[]): Entity[] {
	const target = unitById(units, chain.targetId);

	if (target === null || !ChainComponent.atLastPoint(chain) || ChainComponent.isRunning(chain) || !canJoin(chain, mover, target)) {
		return [];
	}

	return unitsOfFaction(units, UnitFaction.PLAYER).filter((unit) => unit !== mover && canJoin(chain, unit, target));
}

/** Whether `mover` can start a chain from where it stands - it and two others make the three a chain takes. */
export function canChain(chain: ChainData, mover: Entity, units: readonly Entity[]): boolean {
	return chainPartners(chain, mover, units).length >= 2;
}

/** Every pair of `partners`, in order - the formations a chain can be started with. */
export function chainPairs(partners: readonly Entity[]): [Entity, Entity][] {
	return partners.flatMap((first, index) => partners.slice(index + 1).map((second): [Entity, Entity] => [first, second]));
}
