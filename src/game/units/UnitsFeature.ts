import { Entity } from "@/core/ecs/Entity";
import { EventSystem } from "@/core/events/EventSystem";
import { UnsubscribeFunction } from "@/core/events/GameEvents";
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { buildUnit, UnitDocument } from "@/game/units/model/UnitData";
import { UnitRenderSystem } from "@/game/units/systems/UnitRenderSystem";
import dardanDocument from "@/game/units/data/dardan.unit.json";
import hasanDocument from "@/game/units/data/hasan.unit.json";
import deployment from "@/game/units/data/skirmish.deployment.json";

const UNIT_DOCUMENTS: Record<string, UnitDocument> = {
	dardan: dardanDocument as UnitDocument,
	hasan: hasanDocument as UnitDocument
};

/**
 * Puts the playable units on the battle map. It only owns the units themselves -
 * their sheets, tokens and where they stand. Picking one up and moving it is the
 * [[MovementFeature]]'s job, wired to the same `map:*` events.
 *
 * On `map:ready` it deploys the units from `data/*.deployment.json`, parented to
 * the map so their tile coordinates travel with it; on `map:closed` it clears
 * them. With no map on screen the events have no effect.
 */
export class UnitsFeature extends GameFeature {
	@GameCoreService(EventSystem)
	private events!: EventSystem;

	private subscriptions: UnsubscribeFunction[] = [];
	private units: Entity[] = [];

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [UnitComponent],
			// On the "background" layer above the tileset art and the move overlay,
			// below the cursor's own layer - see UnitRenderSystem.
			systems: [{ system: UnitRenderSystem, priority: 17 }],
			...config
		});
	}

	protected onInstall(): void {
		this.subscriptions.push(
			this.events.subscribe("map:ready", (event) => this.deploy(event.mapId)),
			this.events.subscribe("map:closed", () => this.withdraw())
		);
	}

	protected onUninstall(): void {
		this.withdraw();

		for (const unsubscribe of this.subscriptions) {
			unsubscribe();
		}

		this.subscriptions = [];
	}

	private deploy(mapId: string): void {
		this.withdraw();

		for (const placement of deployment.units) {
			const document = UNIT_DOCUMENTS[placement.unit];

			if (document === undefined) {
				continue;
			}

			const entity = this.world.createEntity();
			entity.addComponent(UnitComponent, buildUnit(document));
			entity.addComponent(GridPositionComponent, { column: placement.column, row: placement.row });
			entity.addComponent(TransformComponent, { ...identityTransform, parent: mapId });

			this.units.push(entity);
		}
	}

	private withdraw(): void {
		for (const unit of this.units) {
			this.world.unregisterEntity(unit);
		}

		this.units = [];
	}
}
