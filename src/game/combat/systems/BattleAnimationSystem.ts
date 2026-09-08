import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { BattleAnimationComponent } from "@/game/combat/components/BattleAnimationComponent";
import { CombatAnimationComponent } from "@/game/combat/components/CombatAnimationComponent";
import { battleAnimationFrame, BattleAnimationFrame } from "@/game/combat/model/BattleAnimation";
import { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";

/**
 * Runs the fight animation: advances the clock on the [[BattleAnimationComponent]],
 * writes the per-token [[CombatAnimationComponent]] the renderer reads, and when
 * every swing has played, clears the tokens, reports the deaths (`unit:died`),
 * pops the [[BattleAnimationState]] and fires `combat:resolved`.
 *
 * The HP and weapon-use changes were already applied by CombatFeature - this
 * only delays the *visual* and takes fallen units off the map afterwards.
 */
export class BattleAnimationSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			units: new Query({ allowlist: [UnitComponent] })
		};
	}

	public execute(elapsed: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof BattleAnimationState)) {
			return;
		}

		const entity = state.getAnimation();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(BattleAnimationComponent);
		const data = component.read();

		const units = this.queries.units.getResult();
		const attacker = UnitSystem.byId(units, data.attackerId);
		const defender = UnitSystem.byId(units, data.defenderId);

		const now = data.elapsed + elapsed;
		component.update({ ...data, elapsed: now });

		const frame = battleAnimationFrame(
			data.steps,
			data.startAttackerHp,
			data.startDefenderHp,
			{ column: data.attackerColumn, row: data.attackerRow },
			{ column: data.defenderColumn, row: data.defenderRow },
			now
		);

		this.applyTokenState(attacker, frame.attacker);
		this.applyTokenState(defender, frame.defender);

		if (frame.done) {
			this.finish(data.attackerId, data.defenderId, data.attackerDefeated, data.defenderDefeated, [attacker, defender]);
		}
	}

	private applyTokenState(entity: Entity | null, token: BattleAnimationFrame["attacker"]): void {
		if (entity === null) {
			return;
		}

		if (entity.hasComponent(CombatAnimationComponent)) {
			entity.getComponent(CombatAnimationComponent).update(token);
		} else {
			entity.addComponent(CombatAnimationComponent, token);
		}
	}

	private finish(attackerId: string, defenderId: string, attackerDefeated: boolean, defenderDefeated: boolean, combatants: (Entity | null)[]): void {
		for (const entity of combatants) {
			if (entity !== null && entity.hasComponent(CombatAnimationComponent)) {
				entity.removeComponent(CombatAnimationComponent);
			}
		}

		if (defenderDefeated) {
			this.eventSystem.dispatch("unit:died", { unitId: defenderId });
		}

		if (attackerDefeated) {
			this.eventSystem.dispatch("unit:died", { unitId: attackerId });
		}

		this.stateManager.pop();

		this.eventSystem.dispatch("combat:resolved", { attackerId, defenderId, attackerDefeated, defenderDefeated });
	}
}
