import { AssetStorage } from "@/core/assets/AssetStorage";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { activeCursor } from "@/game/map/rules/ActiveMap";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
import { loadUnitCatalogs } from "@/game/units/content/UnitCatalog";
import { buildUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import { unitsInWorld, unitById } from "@/game/units/rules/UnitLookup";
import { DEPLOYMENT_ASSET, DeploymentDocument, parseDeployment } from "@/game/units/content/Deployments";

/**
 * Puts the playable units on the battle map and takes them off again. On
 * `map:ready` it deploys the units named by the deployment sheet, parented to
 * the map so their tile coordinates travel with it, tags the army's commander
 * and drops the cursor onto that unit; on `map:closed` it clears them. It also
 * floats the HP a vulnerary or a staff put back over the unit, in green.
 *
 * The sheets and the catalogs behind them are content, not code: they ship as
 * JSON assets (`src/assets/data`) and are read back out of [[AssetStorage]]
 * here, so a new character is a sheet plus a manifest entry. `Game.start` has
 * the bundle in storage before the first `map:ready` is delivered.
 */
export class UnitDeploySystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	public initialize(): this {
		this.subscribe("map:ready", (event) => this.deploy(event.mapId));
		this.subscribe("map:closed", () => this.withdraw());
		this.subscribe("unit:usedItem", (event) => this.showHealed(event.unitId, event.healed));
		this.subscribe("staff:resolved", (event) => this.showHealed(event.targetId, event.healed));

		return this;
	}

	public dispose(): void {
		this.withdraw();
		super.dispose();
	}

	private deploy(mapId: string): void {
		this.withdraw();

		// Every sheet resolves its class and weapon against the catalogs, so they
		// have to be in place before the first unit is built.
		loadUnitCatalogs(this.assets);

		for (const placement of this.deployment().units) {
			const document = this.unitDocument(placement.unit);

			if (document === null) {
				continue;
			}

			const data = buildUnit(document);

			const entity = this.world.createEntity();
			entity.addComponent(UnitComponent, data);
			entity.addComponent(GridPositionComponent, { column: placement.column, row: placement.row });
			entity.addComponent(TransformComponent, { ...identityTransform, parent: mapId });

			if (data.commander) {
				entity.addComponent(CommanderComponent, {});
			}
		}

		this.centreCursorOnCommander();
	}

	/** The deployment sheet for this battle, or an empty one when it is not in storage. */
	private deployment(): DeploymentDocument {
		try {
			return parseDeployment(this.assets.getJson(DEPLOYMENT_ASSET));
		} catch (error) {
			console.error(`Deployment "${DEPLOYMENT_ASSET}" could not be read:`, error);
			return { format: "vigilans-deployment", version: 1, map: "", units: [] };
		}
	}

	/**
	 * The sheet a placement names, looked up as `unit-<id>`. A placement naming a
	 * unit the bundle does not carry is skipped rather than taking the whole
	 * battle down with it.
	 */
	private unitDocument(id: string): UnitDocument | null {
		try {
			return this.assets.getJson<UnitDocument>(`unit-${id}`);
		} catch (error) {
			console.error(`Deployment names unit "${id}", which is not in the asset bundle:`, error);
			return null;
		}
	}

	/**
	 * A vulnerary went down, or a staff was raised - float the HP it put back over
	 * the unit in green, the same way a fight floats the damage it took.
	 * `UnitPopSystem` ages the label and takes it off again.
	 */
	private showHealed(unitId: string, healed: number): void {
		if (healed <= 0) {
			return;
		}

		const unit = unitById(unitsInWorld(this.world), unitId);

		if (unit === null) {
			return;
		}

		const pop = UnitPopComponent.heal(healed);

		if (unit.hasComponent(UnitPopComponent)) {
			unit.getComponent(UnitPopComponent).update(pop);
		} else {
			unit.addComponent(UnitPopComponent, pop);
		}
	}

	/** Drops the map cursor onto the commander so a battle opens focused on Dardan. */
	private centreCursorOnCommander(): void {
		const commander = this.world.entityWith(CommanderComponent);
		const cursor = activeCursor(this.world);

		if (commander === null || cursor === null) {
			return;
		}

		const position = commander.getComponent(GridPositionComponent).read();
		cursor.getComponent(GridPositionComponent).update({ column: position.column, row: position.row });
	}

	private withdraw(): void {
		for (const unit of unitsInWorld(this.world)) {
			this.world.unregisterEntity(unit);
		}
	}
}
