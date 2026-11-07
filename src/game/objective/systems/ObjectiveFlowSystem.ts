import { AssetStorage } from "@/core/assets/AssetStorage";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChainStartedEvent, SeizeRequestedEvent } from "@/game.events";
import { ObjectiveComponent, Outcome } from "@/game/objective/components/ObjectiveComponent";
import { objectiveOf, ObjectiveSetup, WinCondition } from "@/game/objective/content/Objectives";
import { battleOutcome, canSeize } from "@/game/objective/rules/Outcome";
import { ObjectiveScreenState } from "@/game/objective/states/ObjectiveScreenState";
import { MapState } from "@/game/map/states/MapState";
import { deploymentAsset, parseDeployment } from "@/game/units/content/Deployments";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * Keeps the battle's objective and decides when it is met:
 *
 *  - On `map:ready` the deployment sheet's objective is read out of the asset
 *    bundle into the [[ObjectiveComponent]] - a rout unless the sheet says
 *    otherwise; on `map:closed` it goes.
 *  - After every `unit:died` - once the combat feature has taken the fallen
 *    off the map, hence the lower priority - the units left are read for an
 *    outcome (`rules/Outcome`): the commander or a protected unit gone, or
 *    nobody left, is a defeat; the last enemy gone is a victory when the
 *    objective is a rout, the target gone when it is a defeat.
 *  - `seize:requested` (the "Seize" command) is a victory when the unit really
 *    can claim the tile.
 *  - `chain:started` is a victory when the objective is a chain against that
 *    target. It is decided at the start, so a counter in the middle of the
 *    chain cannot take the win back; the banner waits for the strikes.
 *  - `objective:requested` (the "Objective" row of the global menu) pushes an
 *    [[ObjectiveScreenState]] over the map: the readout of what the battle is
 *    won and lost by. What it says is read live while it is up.
 *
 * The first outcome sticks: it is written on the component and reported as
 * `objective:decided`, which stops the turns. Showing it is
 * [[ObjectiveSystem]]'s, once the map is quiet; when the banner is
 * acknowledged (`objective:acknowledged`, delivered with the map back on top)
 * the battle is started over by entering the map state again, which tears it
 * down (`map:closed`) and sets it up afresh (`map:ready`). A feature that
 * knows where a won battle leads claims the event ahead of this handler.
 */
export class ObjectiveFlowSystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	public initialize(): this {
		this.subscribe("map:ready", (event) => this.open(event.scenario));
		this.subscribe("map:closed", () => this.close());
		// Below the combat feature's own handler (0), so the fallen unit is already gone.
		this.subscribe("unit:died", () => this.check(), -1);
		this.subscribe("seize:requested", (event) => this.onSeize(event));
		this.subscribe("chain:started", (event) => this.onChainStarted(event));
		this.subscribe("objective:requested", () => this.stateManager.push(ObjectiveScreenState));
		this.subscribe("objective:acknowledged", () => this.stateManager.switch(MapState.type));

		return this;
	}

	public dispose(): void {
		this.close();
		super.dispose();
	}

	private open(scenario: string): void {
		this.close();
		this.world.createEntity().addComponent(ObjectiveComponent, ObjectiveComponent.open(this.setup(scenario)));
	}

	private close(): void {
		const objective = this.world.entityWith(ObjectiveComponent);

		if (objective !== null) {
			this.world.unregisterEntity(objective);
		}
	}

	/** The sheet's objective, or a rout when the sheet cannot be read. */
	private setup(scenario: string): ObjectiveSetup {
		try {
			return objectiveOf(parseDeployment(this.assets.getJson(deploymentAsset(scenario))).objective);
		} catch (error) {
			console.error(`Deployment "${deploymentAsset(scenario)}" could not be read for the objective:`, error);
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

	private onChainStarted(event: ChainStartedEvent): void {
		const objective = this.world.entityWith(ObjectiveComponent)?.getComponent(ObjectiveComponent).read() ?? null;

		if (objective !== null && !ObjectiveComponent.isDecided(objective) && objective.win === WinCondition.CHAIN && objective.target === event.targetId) {
			this.decide(Outcome.VICTORY);
		}
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
