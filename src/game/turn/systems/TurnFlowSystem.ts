import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * Opens and ends the battle turns. It creates the `TurnComponent` entity with
 * the map and marks a turn over - on `turn:end` from the global command menu,
 * or on its own once every player unit has acted (`unit:acted`). The end is
 * only marked here; [[TurnSystem]] completes it once nothing is left over the
 * map - the last action's experience bar or popup seen off - bumping the
 * counter and waking every player unit back up.
 *
 * Every new turn - the first one included - opens with the phase banner
 * ("Player Phase") sweeping across the screen: a [[PhaseBannerState]] pushed
 * over the map, which freezes it until the banner has faded on its own.
 */
export class TurnFlowSystem extends ReactiveSystem {
	public initialize(): void {
		this.subscribe("map:ready", () => this.begin());
		this.subscribe("map:closed", () => this.end());
		this.subscribe("turn:end", () => this.finish());
		this.subscribe("unit:acted", () => this.finishIfDone());
		this.subscribe("turn:changed", (event) => this.announce(event.number));
	}

	public dispose(): void {
		this.end();
		super.dispose();
	}

	private begin(): void {
		this.end();

		this.world.createEntity().addComponent(TurnComponent, { number: 1, ending: false });

		this.events.dispatch("turn:changed", { number: 1 });
	}

	private end(): void {
		const turn = this.world.entityWith(TurnComponent);

		if (turn !== null) {
			this.world.unregisterEntity(turn);
		}
	}

	/** Marks the turn over. `TurnSystem` takes it from here once the map is on top again. */
	private finish(): void {
		const turn = this.world.entityWith(TurnComponent);

		if (turn === null) {
			return;
		}

		const component = turn.getComponent(TurnComponent);
		component.update({ ...component.read(), ending: true });
	}

	private finishIfDone(): void {
		const players = unitsOfFaction(unitsInWorld(this.world), UnitFaction.PLAYER);

		if (players.length > 0 && players.every((unit) => unit.getComponent(UnitComponent).read().hasMoved)) {
			this.finish();
		}
	}

	/** Puts the phase banner up for the turn that just started. Only the player has a phase for now. */
	private announce(turn: number): void {
		this.stateManager.getState(PhaseBannerState).request({ turn, faction: UnitFaction.PLAYER });
		this.stateManager.push(PhaseBannerState);
	}
}
