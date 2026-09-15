import { AssetStorage } from "@/core/assets/AssetStorage";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { SeizeRequestedEvent } from "@/game.events";
import { ObjectiveComponent, Outcome } from "@/game/objective/components/ObjectiveComponent";
import { objectiveOf, ObjectiveSetup } from "@/game/objective/content/Objectives";
import { battleOutcome, canSeize } from "@/game/objective/rules/Outcome";
import { DEPLOYMENT_ASSET, parseDeployment } from "@/game/units/content/Deployments";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * Keeps the battle's objective and decides when it is met:
 *
 *  - On `map:ready` the deployment sheet's objective is read out of the asset
 *    bundle into the [[ObjectiveComponent]] - a rout unless the sheet says
 *    otherwise; on `map:closed` it goes.
 *  - After every `unit:died` - once the combat feature has taken the fallen
 *    off the map, hence the lower priority - the units left are read for an
 *    outcome (`rules/Outcome`): the commander gone or nobody left is a defeat,
 *    the last enemy gone a victory when the objective is a rout.
 *  - `seize:requested` (the "Seize" command) is a victory when the unit really
 *    can claim the tile.
 *
 * The first outcome sticks: it is written on the component and reported as
 * `objective:decided`, which stops the turns. Showing it is
 * [[ObjectiveSystem]]'s, once the map is quiet.
 */
export class ObjectiveFlowSystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	public initialize(): void {
		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		// Below the combat feature's own handler (0), so the fallen unit is already gone.
		this.subscribe("unit:died", () => this.check(), -1);
		this.subscribe("seize:requested", (event) => this.onSeize(event));
	}

	public dispose(): void {
		this.close();
		super.dispose();
	}

	private open(): void {
		this.close();
		this.world.createEntity().addComponent(ObjectiveComponent, ObjectiveComponent.open(this.setup()));
	}

	private close(): void {
		const objective = this.world.entityWith(ObjectiveComponent);

		if (objective !== null) {
			this.world.unregisterEntity(objective);
		}
	}

	/** The sheet's objective, or a rout when the sheet cannot be read. */
	private setup(): ObjectiveSetup {
		try {
			return objectiveOf(parseDeployment(this.assets.getJson(DEPLOYMENT_ASSET)).objective);
		} catch (error) {
			console.error(`Deployment "${DEPLOYMENT_ASSET}" could not be read for the objective:`, error);
			return objectiveOf(undefined);
		}
	}

	private check(): void {
		const objective = this.world.entityWith(ObjectiveComponent);

		if (objective === null || ObjectiveComponent.isDecided(objective.getComponent(ObjectiveComponent).read())) {
			return;
		}

		const outcome = battleOutcome(objective.getComponent(ObjectiveComponent).read(), unitsInWorld(this.world));

		if (outcome !== "") {
			this.decide(outcome);
		}
	}

	private onSeize(event: SeizeRequestedEvent): void {
		const objective = this.world.entityWith(ObjectiveComponent);
		const unit = unitById(unitsInWorld(this.world), event.unitId);

		if (objective === null || unit === null || !canSeize(objective.getComponent(ObjectiveComponent).read(), unit)) {
			return;
		}

		this.decide(Outcome.VICTORY);
	}

	private decide(outcome: Outcome): void {
		const objective = this.world.entityWith(ObjectiveComponent);

		if (objective === null) {
			return;
		}

		const component = objective.getComponent(ObjectiveComponent);
		component.update({ ...component.read(), outcome });

		this.events.dispatch("objective:decided", { outcome });
	}
}
