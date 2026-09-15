import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { BehaviourComponent } from "@/game/ai/components/BehaviourComponent";
import { EnemyActionComponent, EnemyActionData, EnemyActionStep } from "@/game/ai/components/EnemyActionComponent";
import { EnemyBehaviour } from "@/game/ai/content/Behaviours";
import { planEnemyAction, PlanUnit } from "@/game/ai/rules/EnemyPlan";
import { EnemyPhaseState } from "@/game/ai/states/EnemyPhaseState";
import { ENEMY_AIM_MS, ENEMY_FOCUS_MS } from "@/game/ai/view/EnemyPace";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { activeCursor, activeGrid } from "@/game/map/rules/ActiveMap";
import { MapState } from "@/game/map/states/MapState";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { WALK_STEP_MS } from "@/game/movement/view/PathWalk";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { enemiesOf, tileOf, unitById, unitLocations, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * Runs the enemy phase, one unit at a time, the way Fire Emblem's does:
 *
 *  - While the `TurnComponent` says it is the enemy's phase, it holds the map
 *    under an [[EnemyPhaseState]] - pushed the moment the phase banner has
 *    gone and nothing else is over the map - so the cursor and the commands
 *    stay frozen until the phase is over.
 *  - With that state on top it takes the next enemy that has not acted, asks
 *    `rules/EnemyPlan` what it should do, puts the map cursor on it and drives
 *    the plan through the [[EnemyActionComponent]]'s steps: a beat to be
 *    found, the walk (the movement feature's own `WalkComponent`, so the token
 *    moves as the player's do), a beat to aim, then the fight - handed to the
 *    combat feature as `combat:confirmed`, exactly as the forecast hands the
 *    player's over, so the animation, the experience and the deaths all come
 *    from the one place they always did. Anything pushed over the phase - the
 *    fight, an experience bar - simply pauses it.
 *  - A unit whose plan has played out is spent (`unit:acted`), which is what
 *    ends the phase once the last one is; with nobody left to move at all, the
 *    phase ends itself (`turn:end`). Either way the state is popped as soon as
 *    the phase is marked over, so `TurnSystem` finds the map on top and turns
 *    the counter back to the player.
 *
 * The step machine lives on the component and the choosing in the rules; this
 * only decides when each step is over.
 */
export class EnemyPhaseSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private events!: EventBus;

	@GameCoreService(World)
	private world!: World;

	public initialize(): this {
		this.queries = {
			turns: new Query({ allowlist: [TurnComponent] }),
			units: new Query({ allowlist: [UnitComponent] }),
			actions: new Query({ allowlist: [EnemyActionComponent, UnitComponent] })
		};

		return this;
	}

	public execute(elapsed: number): void {
		const turn = this.queries.turns.getSingleResult();

		if (turn === null) {
			return;
		}

		const data = turn.getComponent(TurnComponent).read();
		const top = this.stateManager.peek();
		const holding = top instanceof EnemyPhaseState;

		// Not the enemy's phase, or its end is marked: hand the map back so the
		// turn can turn over.
		if (data.phase !== UnitFaction.ENEMY || data.ending) {
			if (holding) {
				this.stateManager.pop();
			}

			return;
		}

		if (this.isMap(top)) {
			this.stateManager.push(EnemyPhaseState);
			return;
		}

		// The banner, a fight or an experience bar is over the phase - wait for it.
		if (!holding) {
			return;
		}

		const acting = this.queries.actions.getSingleResult();

		if (acting === null) {
			this.beginNext();
		} else {
			this.advance(acting, elapsed);
		}
	}

	/** Picks the next enemy that has not acted and plans its action; ends the phase when there is none. */
	private beginNext(): void {
		const units = this.queries.units.getResult();
		const waiting = unitsOfFaction(units, UnitFaction.ENEMY).filter((unit) => !unit.getComponent(UnitComponent).read().hasMoved);
		const grid = activeGrid(this.world);

		if (waiting.length === 0 || grid === null) {
			this.events.dispatch("turn:end", {});
			return;
		}

		const enemy = waiting[0];
		const behaviour = enemy.hasComponent(BehaviourComponent) ? enemy.getComponent(BehaviourComponent).read().behaviour : EnemyBehaviour.CHARGE;
		const targets: PlanUnit[] = enemiesOf(units, UnitFaction.ENEMY).map((unit) => ({ data: unit.getComponent(UnitComponent).read(), tile: tileOf(unit) }));
		const self: PlanUnit = { data: enemy.getComponent(UnitComponent).read(), tile: tileOf(enemy) };

		const plan = planEnemyAction(grid, self, behaviour, unitLocations(units), targets);

		this.focusCursor(self.tile);
		enemy.addComponent(EnemyActionComponent, EnemyActionComponent.begin(plan.path, plan.targetId, plan.weaponId));
	}

	private advance(acting: Entity, elapsed: number): void {
		const component = acting.getComponent(EnemyActionComponent);
		const action = component.read();

		switch (action.step) {
			case EnemyActionStep.FOCUS:
				if (!this.pause(component, action, elapsed, ENEMY_FOCUS_MS)) {
					return;
				}

				if (action.path.length >= 2) {
					this.walk(acting, action.path);
					component.update(EnemyActionComponent.advance(action, EnemyActionStep.WALK));
				} else {
					component.update(EnemyActionComponent.advance(action, EnemyActionStep.AIM));
				}

				return;

			case EnemyActionStep.WALK:
				// `UnitWalkSystem` runs the walk's clock and drops the component when the token lands.
				if (!acting.hasComponent(WalkComponent)) {
					component.update(EnemyActionComponent.advance(action, EnemyActionStep.AIM));
				}

				return;

			case EnemyActionStep.AIM:
				if (!this.pause(component, action, elapsed, ENEMY_AIM_MS)) {
					return;
				}

				this.strike(acting, component, action);
				return;

			case EnemyActionStep.FIGHT:
				// `EnemyFlowSystem` moves it on when the fight has resolved.
				return;

			case EnemyActionStep.DONE:
				this.spend(acting);
				return;
		}
	}

	/** Runs a step's clock; true once `duration` milliseconds have passed in it. */
	private pause(component: EnemyActionComponent, action: EnemyActionData, elapsed: number, duration: number): boolean {
		const now = action.elapsed + elapsed;

		if (now < duration) {
			component.update({ ...action, elapsed: now });
			return false;
		}

		return true;
	}

	/** Sends the unit off along its route: the tile jumps to the destination now, the token walks to catch up. */
	private walk(acting: Entity, path: GridPositionData[]): void {
		const destination = path[path.length - 1];

		acting.getComponent(GridPositionComponent).update({ column: destination.column, row: destination.row });
		acting.addComponent(WalkComponent, { path, elapsed: 0, duration: (path.length - 1) * WALK_STEP_MS });
	}

	/** Hands the planned fight to the combat feature, or skips straight to done when there is none (or the target is gone). */
	private strike(acting: Entity, component: EnemyActionComponent, action: EnemyActionData): void {
		const target = action.targetId.length > 0 ? unitById(this.queries.units.getResult(), action.targetId) : null;

		if (target === null) {
			component.update(EnemyActionComponent.advance(action, EnemyActionStep.DONE));
			return;
		}

		this.events.dispatch("combat:confirmed", {
			attackerId: acting.getComponent(UnitComponent).read().id,
			defenderId: action.targetId,
			weaponId: action.weaponId
		});
		component.update(EnemyActionComponent.advance(action, EnemyActionStep.FIGHT));
	}

	/** The unit is done for the phase: it greys out and the turn hears of it. */
	private spend(acting: Entity): void {
		const unit = acting.getComponent(UnitComponent);

		unit.update({ ...unit.read(), hasMoved: true });
		acting.removeComponent(EnemyActionComponent);

		this.events.dispatch("unit:acted", { unitId: unit.read().id });
	}

	/** Drops the map cursor onto the unit about to move, so the player sees who it is. */
	private focusCursor(tile: GridPositionData): void {
		const cursor = activeCursor(this.world);

		if (cursor !== null) {
			cursor.getComponent(GridPositionComponent).update({ column: tile.column, row: tile.row });
		}
	}

	/** Whether the battle map itself is the state on top. Matched by type, so a spec can stand in a stub for the real map. */
	private isMap(state: GameState | null): boolean {
		return state !== null && (state.constructor as typeof GameState).type === MapState.type;
	}
}
