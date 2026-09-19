import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { EnemyPhaseState } from "@/game/ai/states/EnemyPhaseState";
import { MapState } from "@/game/map/states/MapState";
import { OutcomeCommand } from "@/game/objective/commands/OutcomeCommands";
import { ObjectiveComponent, Outcome } from "@/game/objective/components/ObjectiveComponent";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
import { OutcomeState } from "@/game/objective/states/OutcomeState";
import { TurnComponent } from "@/game/turn/components/TurnComponent";

/**
 * Shows a decided battle and starts it over:
 *
 *  - Once the [[ObjectiveComponent]] carries an outcome, it waits for the map
 *    to be quiet - the last fight's animation and experience bar seen off, the
 *    map itself or the enemy phase holding it on top - and pushes the
 *    [[OutcomeState]], whose banner freezes everything under it.
 *  - While that state is on top it runs the banner's clock and its
 *    acknowledge command.
 *  - Acknowledged, it pops everything over the map and reports
 *    `objective:acknowledged` with the outcome. [[ObjectiveFlowSystem]] answers
 *    that by starting the battle over - what a lost battle gets in Fire Emblem
 *    - unless a feature that knows where a won battle leads, the campaign,
 *    claims the event first.
 *
 * It runs ahead of the turn's and the enemy phase's clocks in the update
 * schedule, so the banner is on the stack before either of them sees the map
 * on top and moves on.
 */
export class ObjectiveSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private events!: EventBus;

	@GameCoreService(World)
	private world!: World;

	public initialize(): this {
		this.queries = {
			turns: new Query({ allowlist: [TurnComponent] })
		};

		return this;
	}

	public execute(elapsed: number, frame: number): void {
		// Read off the world, not a query: the frame after a restart a query still
		// holds the old battle's objective - entity changes land a frame behind -
		// and its outcome would put the banner straight back up.
		const objective = this.world.entityWith(ObjectiveComponent);

		if (objective === null) {
			return;
		}

		const data = objective.getComponent(ObjectiveComponent).read();

		if (data.outcome === "" || data.acknowledged) {
			return;
		}

		const top = this.stateManager.peek();

		if (top instanceof OutcomeState) {
			this.run(top, objective.getComponent(ObjectiveComponent), elapsed, frame);
			return;
		}

		if (!this.isShowing() && this.isQuiet(top)) {
			this.stateManager.getState(OutcomeState).request({ outcome: data.outcome, turn: this.turnNumber() });
			this.stateManager.push(OutcomeState);
		}
	}

	/** The banner is up: advance its clock, take the press, and hand the outcome on once it is acknowledged. */
	private run(state: OutcomeState, objective: ObjectiveComponent, elapsed: number, frame: number): void {
		const entity = state.getBanner();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(OutcomeComponent);
		const data = component.read();

		if (data.acknowledged) {
			this.acknowledge(objective, data.outcome);
			return;
		}

		component.update({ ...data, elapsed: data.elapsed + elapsed });

		for (const command of state.getCommands(OutcomeCommand)) {
			command.execute(elapsed, frame, { outcome: entity });
		}
	}

	/**
	 * Pops everything over the map - the banner included - and hands the
	 * outcome on. The objective is marked acknowledged first: the map is on top
	 * again for a frame before whoever answers the event takes it down, and a
	 * decided objective on a quiet map is exactly what puts the banner up.
	 */
	private acknowledge(component: ObjectiveComponent, outcome: Outcome): void {
		component.update({ ...component.read(), acknowledged: true });

		while (this.stateManager.peek() !== null && !this.isMap(this.stateManager.peek())) {
			this.stateManager.pop();
		}

		this.events.dispatch("objective:acknowledged", { outcome });
	}

	/** Whether the outcome banner is already on the stack, on top or under something. */
	private isShowing(): boolean {
		return this.stateManager.getCurrentStates().some((state) => state instanceof OutcomeState);
	}

	/** Nothing transient is over the map: the map itself is on top, or the enemy phase holding it. */
	private isQuiet(state: GameState | null): boolean {
		return this.isMap(state) || state instanceof EnemyPhaseState;
	}

	/** Whether the battle map is this state. Matched by type, so a spec can stand in a stub for the real map. */
	private isMap(state: GameState | null): boolean {
		return state !== null && (state.constructor as typeof GameState).type === MapState.type;
	}

	private turnNumber(): number {
		return this.queries.turns.getSingleResult()?.getComponent(TurnComponent).read().number ?? 1;
	}
}
