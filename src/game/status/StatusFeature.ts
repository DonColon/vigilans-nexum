import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { MapInfoRequestedEvent } from "@/game.events";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { statusCommands } from "@/game/status/commands/StatusCommands";
import { StatusComponent } from "@/game/status/components/StatusComponent";
import { StatusState } from "@/game/status/states/StatusState";
import { StatusRenderSystem } from "@/game/status/systems/StatusRenderSystem";
import { StatusSystem } from "@/game/status/systems/StatusSystem";
import { UnitCardRenderSystem } from "@/game/status/systems/UnitCardRenderSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Looking at a unit, in two shapes:
 *
 *  - The hover card: while the map cursor rests on a unit - yours or theirs -
 *    a small card beside it names it, its class and level, shows its HP and
 *    what it has readied. Nothing to press; it follows the cursor and goes
 *    away when nothing is under it, when a unit is picked up to move or
 *    attack, or when something is pushed over the map.
 *  - The unit sheet: the info button (`map:infoRequested`, I / Q, Y / LB) over
 *    a unit opens a [[StatusState]] over the map, which freezes it the way a
 *    menu does, with everything on the sheet - stats against their caps, the
 *    combat numbers they come to, the whole pack. Left and right page through
 *    every unit on the map, moving the cursor with them; confirm, cancel or
 *    the info button again closes it and reports `status:closed`. It is a
 *    readout: nothing about the unit changes.
 *
 * Every unit type gets the same treatment. An enemy's sheet is as open as your
 * own - Fire Emblem lets you read the other side, and planning a fight depends
 * on it.
 */
export class StatusFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [StatusComponent],
			states: [StatusState],
			commands: [...statusCommands],
			systems: [
				// Alongside MenuSystem / RosterSystem in the update phase.
				{ system: StatusSystem, priority: 10 },
				// Right after UIRenderSystem (50) clears the layer, under the corner
				// HUDs (54, 55): the card sits beside a tile, never over a readout.
				{ system: UnitCardRenderSystem, priority: 51 },
				// Above the corner HUDs: a full page covers them while it is up.
				{ system: StatusRenderSystem, priority: 56 }
			],
			...config
		});
	}

	protected onInstall(): void {
		this.subscribe("map:infoRequested", (event) => this.onInfo(event));
	}

	/**
	 * The info button over a tile: open the sheet of whoever is standing there.
	 * An empty tile is a no-op, and so is a press while a unit walks a move -
	 * input is locked until it lands, the same as for confirm and cancel.
	 */
	private onInfo(event: MapInfoRequestedEvent): void {
		if (this.isWalking()) {
			return;
		}

		const units = UnitSystem.inWorld(this.world);
		const unit = UnitSystem.unitAt(units, event.column, event.row);

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

	/** A unit is mid-walk - the sheet waits until it lands. */
	private isWalking(): boolean {
		return this.world.getEntities().some((entity) => entity.hasComponent(WalkComponent));
	}
}
