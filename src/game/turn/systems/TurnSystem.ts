import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MapState } from "@/game/map/states/MapState";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * Completes a phase that `TurnFlowSystem` has marked as ending: the moment the
 * map is on top of the state stack again - the last action's experience bar,
 * popup or animation gone - it turns the counter over to the next side (see
 * `TurnComponent.next`), wakes every unit and reports `turn:changed`, which
 * puts the phase banner up.
 *
 * Every unit wakes, not just the side about to act: a spent unit greys out
 * only for the rest of its own phase, the way Fire Emblem's do, so the player's
 * army is back in colour while the enemy moves and the enemy's is while the
 * player does.
 *
 * Waiting for the map is what keeps the banner from landing on top of an
 * experience bar: the last unit's fight resolves, `unit:acted` ends the phase,
 * and the bar is pushed in the same breath. Nothing else is held up by this -
 * while something is over the map the player cannot act anyway.
 */
export class TurnSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private eventBus!: EventBus;

	public initialize(): void {
		this.queries = {
			turns: new Query({ allowlist: [TurnComponent] }),
			units: new Query({ allowlist: [UnitComponent] })
		};
	}

	public execute(): void {
		const turn = this.queries.turns.getSingleResult();

		if (turn === null) {
			return;
		}

		const component = turn.getComponent(TurnComponent);
		const data = component.read();

		if (!data.ending || !this.mapOnTop()) {
			return;
		}

		const units = this.queries.units.getResult();
		const next = TurnComponent.next(data, (faction) => unitsOfFaction(units, faction).length > 0);
		component.update(next);

		for (const unit of units) {
			const unitData = unit.getComponent(UnitComponent);
			unitData.update({ ...unitData.read(), hasMoved: false });
		}

		this.eventBus.dispatch("turn:changed", { number: next.number, phase: next.phase });
	}

	/** Whether the battle map is the state on top - nothing pushed over it. Matched by type, so a spec can stand in a stub for the real map. */
	private mapOnTop(): boolean {
		const state = this.stateManager.peek();

		return state !== null && (state.constructor as typeof GameState).type === MapState.type;
	}
}
