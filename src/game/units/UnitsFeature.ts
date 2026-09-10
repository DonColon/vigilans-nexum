import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { GameCoreService } from "@/core/service/GameCoreService";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitUsedItemEvent } from "@/game.events";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
import { loadUnitCatalogs } from "@/game/units/model/UnitCatalog";
import { buildUnit, UnitDocument } from "@/game/units/model/UnitData";
import { healPopText, PopKind, POP_LIFETIME_MS } from "@/game/units/model/UnitPop";
import { UnitPopSystem } from "@/game/units/systems/UnitPopSystem";
import { UnitRenderSystem } from "@/game/units/systems/UnitRenderSystem";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/** Asset id of the deployment sheet this battle puts on the map. */
const DEPLOYMENT_ASSET = "deployment-skirmish";

/** A deployment sheet, as authored in `src/assets/data/deployments/*.deployment.json`. */
interface DeploymentDocument {
	units: { unit: string; column: number; row: number }[];
}

/**
 * Puts the playable units on the battle map. It only owns the units themselves -
 * their sheets, tokens and where they stand. Picking one up and moving it is the
 * [[MovementFeature]]'s job, wired to the same `map:*` events.
 *
 * On `map:ready` it deploys the units named by the deployment sheet, parented to
 * the map so their tile coordinates travel with it, tags the army's commander
 * and drops the cursor onto that unit; on `map:closed` it clears them. With no
 * map on screen the events have no effect.
 *
 * The sheets and the catalogs behind them are content, not code: they ship as
 * JSON assets (`src/assets/data`) and are read back out of [[AssetStorage]]
 * here, so a new character is a sheet plus a manifest entry. `Game.start` has
 * the bundle in storage before the first `map:ready` is delivered.
 */
export class UnitsFeature extends BattleMapFeature {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	private units: Entity[] = [];

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [UnitComponent, CommanderComponent, UnitPopComponent],
			systems: [
				// On the "background" layer above the tileset art and the move overlay,
				// below the cursor's own layer - see UnitRenderSystem.
				{ system: UnitRenderSystem, priority: 17 },
				// Runs the floating-label clock; order among the update systems does not matter.
				{ system: UnitPopSystem, priority: 8 }
			],
			...config
		});
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:ready", (event) => this.deploy(event.mapId));
		this.subscribe("map:closed", () => this.withdraw());
		this.subscribe("unit:usedItem", (event) => this.showHealed(event));
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.withdraw();
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

			this.units.push(entity);
		}

		this.centreCursorOnCommander();
	}

	/** The deployment sheet for this battle, or an empty one when it is not in storage. */
	private deployment(): DeploymentDocument {
		try {
			return this.assets.getJson<DeploymentDocument>(DEPLOYMENT_ASSET);
		} catch (error) {
			console.error(`Deployment "${DEPLOYMENT_ASSET}" is not in the asset bundle:`, error);
			return { units: [] };
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
	 * A vulnerary went down - float the HP it put back over the unit in green,
	 * the same way a fight floats the damage it took. `UnitPopSystem` ages the
	 * label and takes it off again.
	 */
	private showHealed(event: UnitUsedItemEvent): void {
		if (event.healed <= 0) {
			return;
		}

		const unit = UnitSystem.byId(UnitSystem.inWorld(this.world), event.unitId);

		if (unit === null) {
			return;
		}

		const pop = { text: healPopText(event.healed), kind: PopKind.HEAL, elapsed: 0, duration: POP_LIFETIME_MS };

		if (unit.hasComponent(UnitPopComponent)) {
			unit.getComponent(UnitPopComponent).update(pop);
		} else {
			unit.addComponent(UnitPopComponent, pop);
		}
	}

	/** Drops the map cursor onto the commander so a battle opens focused on Dardan. */
	private centreCursorOnCommander(): void {
		const commander = this.units.find((unit) => unit.hasComponent(CommanderComponent));
		const cursor = this.cursor();

		if (commander === undefined || cursor === null) {
			return;
		}

		const position = commander.getComponent(GridPositionComponent).read();
		cursor.getComponent(GridPositionComponent).update({ column: position.column, row: position.row });
	}

	private withdraw(): void {
		for (const unit of this.units) {
			this.world.unregisterEntity(unit);
		}

		this.units = [];
	}
}
