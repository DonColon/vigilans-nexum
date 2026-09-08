import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitUsedItemEvent } from "@/game.events";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
import { buildUnit, UnitDocument } from "@/game/units/model/UnitData";
import { healPopText, PopKind, POP_LIFETIME_MS } from "@/game/units/model/UnitPop";
import { UnitPopSystem } from "@/game/units/systems/UnitPopSystem";
import { UnitRenderSystem } from "@/game/units/systems/UnitRenderSystem";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import besnikDocument from "@/game/units/data/besnik.unit.json";
import dardanDocument from "@/game/units/data/dardan.unit.json";
import hasanDocument from "@/game/units/data/hasan.unit.json";
import deployment from "@/game/units/data/skirmish.deployment.json";

const UNIT_DOCUMENTS: Record<string, UnitDocument> = {
	dardan: dardanDocument as UnitDocument,
	hasan: hasanDocument as UnitDocument,
	besnik: besnikDocument as UnitDocument
};

/**
 * Puts the playable units on the battle map. It only owns the units themselves -
 * their sheets, tokens and where they stand. Picking one up and moving it is the
 * [[MovementFeature]]'s job, wired to the same `map:*` events.
 *
 * On `map:ready` it deploys the units from `data/*.deployment.json`, parented to
 * the map so their tile coordinates travel with it, tags the army's commander
 * and drops the cursor onto that unit; on `map:closed` it clears them. With no
 * map on screen the events have no effect.
 */
export class UnitsFeature extends BattleMapFeature {
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

		for (const placement of deployment.units) {
			const document = UNIT_DOCUMENTS[placement.unit];

			if (document === undefined) {
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
