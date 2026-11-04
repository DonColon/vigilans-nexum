import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { Entity } from "@/core/ecs/Entity";
import { PositionalConfirmedEvent, PositionalRequestedEvent } from "@/game.events";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { activeGrid } from "@/game/map/rules/ActiveMap";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { WALK_STEP_MS } from "@/game/movement/view/PathWalk";
import { PositionalStep } from "@/game/positional/components/PositionalChoiceComponent";
import { PositionalComponent } from "@/game/positional/components/PositionalComponent";
import { isPositionalAbility } from "@/game/positional/content/PositionalAbilities";
import { positionalOption, positionalOptions } from "@/game/positional/rules/Positioning";
import { PositionalState } from "@/game/positional/states/PositionalState";
import { tileOf, unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * The Base tier's positional abilities - Swap, Shove, Reposition, Knockback,
 * Draw Back and Mystic Pull - the movement tools a fresh army learns first
 * (`design/catalog/Abilities.md`).
 *
 *  - On `map:ready` the battle is marked with a [[PositionalComponent]]; the
 *    [[MovementFeature]] asks the positioning rules which of the unit's
 *    abilities have somebody in reach, and offers a row for each.
 *  - `positional:requested` opens [[PositionalState]]: the map cursor moves
 *    onto the first unit the ability could be used on, any direction steps
 *    between the others, and a wash shows where the pieces would land.
 *    `positional:confirmed` settles it.
 *  - The pieces then slide: every unit the ability moves has its tile written
 *    at once - occupancy and blocking stay correct - and walks the one or two
 *    tiles to catch up, the same way a move lands. `positional:resolved`
 *    reports it; using an ability is the unit's action for the turn, so the
 *    move flow spends the user on it.
 *  - Backing out reports `positional:cancelled`, which puts the unit's command
 *    menu back with its turn intact.
 *
 * Which abilities a unit has is content - the `abilities` line of its sheet
 * under `src/assets/data/units`.
 */
export class PositionalFlowSystem extends ReactiveSystem {
	public initialize(): this {
		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("positional:requested", (event) => this.onRequested(event));
		this.subscribe("positional:confirmed", (event) => this.onConfirmed(event));

		return this;
	}

	public dispose(): void {
		this.close();
		super.dispose();
	}

	/** Marks the battle, so the move flow knows the abilities are in play. */
	private open(): void {
		this.close();
		this.world.createEntity().addComponent(PositionalComponent, {});
	}

	private close(): void {
		const marker = this.world.entityWith(PositionalComponent);

		if (marker !== null) {
			this.world.unregisterEntity(marker);
		}
	}

	/**
	 * A positional row was chosen: open the choice with the map cursor on the
	 * first unit in reach. An ability with nobody to use it on is cancelled
	 * straight back - the row should not have been offered.
	 */
	private onRequested(event: PositionalRequestedEvent): void {
		const units = unitsInWorld(this.world);
		const unit = unitById(units, event.unitId);
		const grid = activeGrid(this.world);

		if (unit === null || grid === null || !isPositionalAbility(event.ability)) {
			this.events.dispatch("positional:cancelled", { unitId: event.unitId });
			return;
		}

		const options = positionalOptions(event.ability, unit, units, grid);

		if (options.length === 0) {
			this.events.dispatch("positional:cancelled", { unitId: event.unitId });
			return;
		}

		const tile = tileOf(unit);

		this.stateManager.getState(PositionalState).request({
			unitId: event.unitId,
			ability: event.ability,
			options,
			restoreColumn: tile.column,
			restoreRow: tile.row
		});
		this.stateManager.push(PositionalState);
	}

	/**
	 * The target was settled on: work the move out once more against the live
	 * board - nothing can have changed under a frozen map, but the rule is what
	 * decides, not the choice - and slide the pieces.
	 */
	private onConfirmed(event: PositionalConfirmedEvent): void {
		const units = unitsInWorld(this.world);
		const user = unitById(units, event.unitId);
		const target = unitById(units, event.targetId);
		const grid = activeGrid(this.world);
		const option = user === null || target === null || grid === null || !isPositionalAbility(event.ability) ? null : positionalOption(event.ability, user, target, units, grid);

		if (option === null) {
			this.events.dispatch("positional:cancelled", { unitId: event.unitId });
			return;
		}

		for (const step of option.steps) {
			const unit = unitById(units, step.unitId);

			if (unit !== null) {
				this.slide(unit, step);
			}
		}

		this.events.dispatch("positional:resolved", { unitId: event.unitId, ability: event.ability, targetId: event.targetId, steps: option.steps });
	}

	/**
	 * Puts a unit on its new tile now and lets the token catch up along the
	 * straight line - the same catch-up a move plays, so `unit:moved` lands
	 * once the slide does.
	 */
	private slide(unit: Entity, step: PositionalStep): void {
		const from = { column: step.fromColumn, row: step.fromRow };
		const to = { column: step.toColumn, row: step.toRow };
		const path = this.straightPath(from, to);

		unit.getComponent(GridPositionComponent).update({ ...to });

		if (unit.hasComponent(WalkComponent)) {
			unit.removeComponent(WalkComponent);
		}

		unit.addComponent(WalkComponent, { path, elapsed: 0, duration: (path.length - 1) * WALK_STEP_MS });
	}

	/**
	 * Every tile from `from` to `to`, both included - what a push or a pull runs
	 * over. The six only ever move a piece along one axis; were one to move it
	 * off both, the columns are walked first and the rows after.
	 */
	private straightPath(from: GridPositionData, to: GridPositionData): GridPositionData[] {
		const path: GridPositionData[] = [from];
		const dc = Math.sign(to.column - from.column);
		const dr = Math.sign(to.row - from.row);
		let current = from;

		while (current.column !== to.column) {
			current = { column: current.column + dc, row: current.row };
			path.push(current);
		}

		while (current.row !== to.row) {
			current = { column: current.column, row: current.row + dr };
			path.push(current);
		}

		return path;
	}
}
