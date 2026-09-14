import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { RosterState } from "@/game/roster/states/RosterState";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * Opens the army list: `roster:requested` (the "Units" row of the global
 * menu) pushes a [[RosterState]] on every player unit, back on the row it was
 * last left on.
 */
export class RosterFlowSystem extends ReactiveSystem {
	/** Row the list was last left on, so re-opening it comes back to the same unit. */
	private lastIndex = 0;

	public initialize(): void {
		this.subscribe("roster:requested", () => this.open());
		this.subscribe("roster:closed", (event) => (this.lastIndex = Math.max(0, event.selectedIndex)));
		this.subscribe("map:closed", () => (this.lastIndex = 0));
	}

	/** Opens the list on every player unit currently on the map. */
	private open(): void {
		const unitIds = unitsOfFaction(unitsInWorld(this.world), UnitFaction.PLAYER).map((unit) => unit.getComponent(UnitComponent).read().id);

		this.stateManager.getState(RosterState).request({ unitIds, selectedIndex: this.lastIndex });
		this.stateManager.push(RosterState);
	}
}
