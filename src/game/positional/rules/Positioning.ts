import { Entity } from "@/core/ecs/Entity";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { isPassable } from "@/game/map/content/Terrain";
import { PositionalOption, PositionalStep } from "@/game/positional/components/PositionalChoiceComponent";
import { isPositionalAbility, POSITIONAL_ABILITIES, PositionalAbility } from "@/game/positional/content/PositionalAbilities";
import { UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { alliesBeside, tileOf, unitAt, unitsBeside } from "@/game/units/rules/UnitLookup";

/*
 * Where the six positional abilities put people - see
 * `design/catalog/Abilities.md`, *Base - positional*. Pure: everything is read
 * off the units the caller hands over and the grid, so the move flow asks
 * before offering a row, the flow asks again before it moves anyone and a spec
 * asks directly.
 *
 * A piece may only be put on a tile that is on the map, passable and empty;
 * an ability with nowhere to put anyone has no target and is not offered.
 * The two pushes - Shove and Knockback - take anyone standing beside the
 * user, ally or enemy, the way Radiant Dawn's Shove and Smite do; the four
 * that trade places with or pull someone in only ever take an ally. Pushing
 * an enemy is a contest of Strength: the catalog says it fails when the
 * target's is above the user's, so such an enemy is not offered at all rather
 * than letting the player spend the action on nothing. An ally is always
 * pushable - they go along with it.
 */

/** A tile a piece may be put on: on the map, passable terrain, nobody standing on it. */
export function isOpenTile(grid: GridData, units: readonly Entity[], tile: GridPositionData): boolean {
	const terrain = GridComponent.terrainAt(grid, tile.column, tile.row);

	return terrain !== null && isPassable(terrain) && unitAt(units, tile.column, tile.row) === null;
}

/**
 * Whether `user` can push `target` against its will - the Strength contest the
 * catalog puts on Shove and Knockback: it fails when the target's Strength is
 * above the user's, so equal Strength still moves them. Asked only of an enemy;
 * an ally is never contested.
 */
export function canPush(user: UnitData, target: UnitData): boolean {
	return target.stats.strength <= user.stats.strength;
}

/** The tile `steps` tiles on from `from` along the direction from `origin` to `from`. */
function beyond(origin: GridPositionData, from: GridPositionData, steps: number): GridPositionData {
	return { column: from.column + (from.column - origin.column) * steps, row: from.row + (from.row - origin.row) * steps };
}

function step(unit: Entity, from: GridPositionData, to: GridPositionData): PositionalStep {
	return { unitId: unit.getComponent(UnitComponent).read().id, fromColumn: from.column, fromRow: from.row, toColumn: to.column, toRow: to.row };
}

/** The allies exactly two tiles from `unit` - the ones Mystic Pull can bring in; an ally already beside it has nowhere nearer to go. */
function alliesTwoOff(units: readonly Entity[], unit: Entity): Entity[] {
	const faction = unit.getComponent(UnitComponent).read().faction;
	const tile = tileOf(unit);

	return units.filter((other) => other !== unit && other.getComponent(UnitComponent).read().faction === faction && GridPositionComponent.distance(tileOf(other), tile) === 2);
}

/**
 * The tile beside `user` that an ally two tiles off is pulled onto: the one
 * tile between them when they are in line, else - on the diagonal - the
 * horizontal neighbour first and the vertical one when that is taken.
 */
function pullDestinations(user: GridPositionData, ally: GridPositionData): GridPositionData[] {
	const dc = Math.sign(ally.column - user.column);
	const dr = Math.sign(ally.row - user.row);
	const candidates: GridPositionData[] = [];

	if (dc !== 0) {
		candidates.push({ column: user.column + dc, row: user.row });
	}

	if (dr !== 0) {
		candidates.push({ column: user.column, row: user.row + dr });
	}

	return candidates;
}

/**
 * What `ability` does to `target` when `user` uses it on them, or null when
 * the target is not one the ability can be used on from where the two stand -
 * the wrong side, the wrong distance, or nowhere open to put anyone.
 */
export function positionalOption(ability: PositionalAbility, user: Entity, target: Entity, units: readonly Entity[], grid: GridData): PositionalOption | null {
	const userData = user.getComponent(UnitComponent).read();
	const targetData = target.getComponent(UnitComponent).read();
	const sameSide = userData.faction === targetData.faction;
	const from = tileOf(user);
	const at = tileOf(target);
	const distance = GridPositionComponent.distance(from, at);
	const open = (tile: GridPositionData) => isOpenTile(grid, units, tile);
	const option = (steps: PositionalStep[]): PositionalOption => ({ targetId: targetData.id, steps });
	// An ally goes along with a push; an enemy has to be overpowered - see {@link canPush}.
	const pushable = sameSide || canPush(userData, targetData);

	if (target === user) {
		return null;
	}

	switch (ability) {
		case PositionalAbility.SWAP:
			return sameSide && distance === 1 ? option([step(user, from, at), step(target, at, from)]) : null;

		case PositionalAbility.SHOVE: {
			// A push takes anyone beside the user, whichever side they are on, as long as they can be moved.
			const to = beyond(from, at, 1);
			return pushable && distance === 1 && open(to) ? option([step(target, at, to)]) : null;
		}

		case PositionalAbility.REPOSITION: {
			const to = beyond(at, from, 1);
			return sameSide && distance === 1 && open(to) ? option([step(target, at, to)]) : null;
		}

		case PositionalAbility.KNOCKBACK: {
			// The unit passes through the first tile to land on the second, so both have to be clear.
			const through = beyond(from, at, 1);
			const to = beyond(from, at, 2);
			return pushable && distance === 1 && open(through) && open(to) ? option([step(target, at, to)]) : null;
		}

		case PositionalAbility.DRAW_BACK: {
			// The user steps back first; the ally then takes the tile it just left.
			const to = beyond(at, from, 1);
			return sameSide && distance === 1 && open(to) ? option([step(user, from, to), step(target, at, from)]) : null;
		}

		case PositionalAbility.MYSTIC_PULL: {
			if (!sameSide || distance !== 2) {
				return null;
			}

			const to = pullDestinations(from, at).find(open);
			return to === undefined ? null : option([step(target, at, to)]);
		}
	}
}

/** Everyone `unit` could use `ability` on from where it stands, in the order the cursor steps through them. */
export function positionalOptions(ability: PositionalAbility, unit: Entity, units: readonly Entity[], grid: GridData): PositionalOption[] {
	const candidates =
		ability === PositionalAbility.SHOVE || ability === PositionalAbility.KNOCKBACK
			? unitsBeside(units, unit)
			: ability === PositionalAbility.MYSTIC_PULL
				? alliesTwoOff(units, unit)
				: alliesBeside(units, unit);

	return candidates.map((target) => positionalOption(ability, unit, target, units, grid)).filter((option): option is PositionalOption => option !== null);
}

/** The positional abilities on `unit`'s sheet, in catalog order - whether or not anyone is in reach of them. */
export function positionalAbilitiesOf(unit: Entity): PositionalAbility[] {
	const known = new Set(unit.getComponent(UnitComponent).read().abilities.filter(isPositionalAbility));

	return POSITIONAL_ABILITIES.filter((ability) => known.has(ability));
}

/** Of those, the ones with somebody to use them on right now - the rows the command menu offers. */
export function availablePositionalAbilities(unit: Entity, units: readonly Entity[], grid: GridData): PositionalAbility[] {
	return positionalAbilitiesOf(unit).filter((ability) => positionalOptions(ability, unit, units, grid).length > 0);
}
