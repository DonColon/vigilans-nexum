import { AssetStorage } from "@/core/assets/AssetStorage";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CombatResolvedEvent } from "@/game.events";
import { BehaviourComponent } from "@/game/ai/components/BehaviourComponent";
import { EnemyActionComponent, EnemyActionStep } from "@/game/ai/components/EnemyActionComponent";
import { behaviourOf } from "@/game/ai/content/Behaviours";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { deploymentAsset, DeploymentPlacement, parseDeployment, placementId } from "@/game/units/content/Deployments";
import { unitById, unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * The enemy phase's event side:
 *
 *  - On `map:ready`, once the units feature has put everybody on the map, it
 *    reads the deployment sheet back and tags every enemy with the behaviour
 *    its placement asked for ([[BehaviourComponent]]) - a boss holds, the rest
 *    charge, unless the sheet says otherwise.
 *  - On `combat:resolved` it moves the acting enemy's action on: the fight it
 *    handed to the combat feature has played out, so the unit is done. An
 *    attacker felled by the counter is already off the map by then, and takes
 *    its action with it.
 *
 * The moving itself is on the frame clock - see [[EnemyPhaseSystem]].
 */
export class EnemyFlowSystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	public initialize(): this {
		// Below the units feature's own handler (0), so the units are on the map to tag.
		this.subscribe("map:ready", (event) => this.tagEnemies(event.scenario), -1);
		this.subscribe("combat:resolved", (event) => this.onCombatResolved(event));

		return this;
	}

	private tagEnemies(scenario: string): void {
		const placements = this.placements(scenario);

		for (const enemy of unitsOfFaction(unitsInWorld(this.world), UnitFaction.ENEMY)) {
			const data = enemy.getComponent(UnitComponent).read();
			const placement = placements.find((candidate) => placementId(candidate) === data.id) ?? null;
			const tag = { behaviour: behaviourOf(placement, data.boss), chargeFromTurn: placement?.chargeFromTurn ?? 0 };

			if (enemy.hasComponent(BehaviourComponent)) {
				enemy.getComponent(BehaviourComponent).update(tag);
			} else {
				enemy.addComponent(BehaviourComponent, tag);
			}
		}
	}

	/** The battle's deployment placements, or none when the sheet cannot be read - every enemy then gets the default. */
	private placements(scenario: string): DeploymentPlacement[] {
		try {
			return parseDeployment(this.assets.getJson(deploymentAsset(scenario))).units;
		} catch (error) {
			console.error(`Deployment "${deploymentAsset(scenario)}" could not be read for the enemy's behaviours:`, error);
			return [];
		}
	}

	private onCombatResolved(event: CombatResolvedEvent): void {
		const attacker = unitById(unitsInWorld(this.world), event.attackerId);

		if (attacker === null || !attacker.hasComponent(EnemyActionComponent)) {
			return;
		}

		const component = attacker.getComponent(EnemyActionComponent);
		const action = component.read();

		if (action.step === EnemyActionStep.FIGHT) {
			component.update(EnemyActionComponent.advance(action, EnemyActionStep.DONE));
		}
	}
}
