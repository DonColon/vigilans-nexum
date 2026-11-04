import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { MapInfoRequestedEvent } from "@/game.events";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { StatusState } from "@/game/status/states/StatusState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitAt } from "@/game/units/rules/UnitLookup";

/**
 * Opens the unit sheet: the info button over a tile (`map:infoRequested`)
 * pushes a [[StatusState]] on whoever is standing there.
 */
export class StatusFlowSystem extends ReactiveSystem {
	public initialize(): this {
		this.subscribe("map:infoRequested", (event) => this.onInfo(event));

		return this;
	}

	/**
	 * The info button over a tile: open the sheet of whoever is standing there.
	 * An empty tile is a no-op, and so is a press while a unit walks a move -
	 * input is locked until it lands, the same as for confirm and cancel.
	 */
	private onInfo(event: MapInfoRequestedEvent): void {
		if (this.world.entityWith(WalkComponent) !== null) {
			return;
		}

		const units = unitsInWorld(this.world);
		const unit = unitAt(units, event.column, event.row);

		if (unit === null) {
			return;
		}

		// Every unit on the map, in the order they stand in the world - what left
		// and right page through.
		const unitIds = units.map((entity) => entity.getComponent(UnitComponent).read().id);
		const unitId = unit.getComponent(UnitComponent).read().id;

		this.stateManager.getState(StatusState).request({ unitIds, index: unitIds.indexOf(unitId) });
		this.stateManager.push(StatusState);

		this.events.dispatch("status:opened", { unitId });
	}
}
