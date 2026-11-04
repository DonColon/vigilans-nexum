import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { TurnChangedEvent } from "@/game.events";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { activeCursor } from "@/game/map/rules/ActiveMap";
import { moveCursorTo } from "@/game/map/rules/MapCursor";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { PhaseBannerState } from "@/game/turn/states/PhaseBannerState";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitsOfFaction } from "@/game/units/rules/UnitLookup";

/**
 * Opens and ends the battle phases. It creates the `TurnComponent` entity with
 * the map and marks a phase over - on `turn:end` from the global command menu
 * (or from the enemy phase once it has nobody left to move), or on its own once
 * every unit of the acting side has acted (`unit:acted`). The end is only
 * marked here; [[TurnSystem]] completes it once nothing is left over the map -
 * the last action's experience bar or popup seen off - turning the counter
 * over to the next side and waking every unit back up.
 *
 * Once the battle is decided (`objective:decided`) the counter stops for
 * good - see [[TurnSystem]].
 *
 * Every new phase - the first one included - opens with the phase banner
 * ("Player Phase" / "Enemy Phase") sweeping across the screen: a
 * [[PhaseBannerState]] pushed over the map, which freezes it until the banner
 * has faded on its own. A player phase also brings the map cursor back to the
 * commander, so every turn opens where the army's head is rather than
 * wherever the enemy's last move left it.
 */
export class TurnFlowSystem extends ReactiveSystem {
	public initialize(): this {
		this.subscribe("map:ready", () => this.begin());
		this.subscribe("map:closed", () => this.end());
		this.subscribe("turn:end", () => this.finish());
		this.subscribe("unit:acted", () => this.finishIfDone());
		this.subscribe("turn:changed", (event) => this.announce(event));
		this.subscribe("objective:decided", () => this.stop());

		return this;
	}

	public dispose(): void {
		this.end();
		super.dispose();
	}

	private begin(): void {
		this.end();

		const opening = TurnComponent.opening();
		this.world.createEntity().addComponent(TurnComponent, opening);

		this.events.dispatch("turn:changed", { number: opening.number, phase: opening.phase });
	}

	private end(): void {
		const turn = this.world.entityWith(TurnComponent);

		if (turn !== null) {
			this.world.unregisterEntity(turn);
		}
	}

	/** Marks the phase over. `TurnSystem` takes it from here once the map is on top again. */
	private finish(): void {
		const turn = this.world.entityWith(TurnComponent);

		if (turn === null) {
			return;
		}

		const component = turn.getComponent(TurnComponent);
		component.update({ ...component.read(), ending: true });
	}

	/** The battle is decided: the counter stops, whatever phase it is in. */
	private stop(): void {
		const turn = this.world.entityWith(TurnComponent);

		if (turn === null) {
			return;
		}

		const component = turn.getComponent(TurnComponent);
		component.update({ ...component.read(), over: true });
	}

	/** The acting side has nobody left to move - the phase is over on its own. */
	private finishIfDone(): void {
		const turn = this.world.entityWith(TurnComponent);

		if (turn === null) {
			return;
		}

		const acting = unitsOfFaction(unitsInWorld(this.world), turn.getComponent(TurnComponent).read().phase);

		if (acting.length > 0 && acting.every((unit) => unit.getComponent(UnitComponent).read().hasMoved)) {
			this.finish();
		}
	}

	/** Puts the phase banner up for the phase that just started - and, for the player's, the cursor on the commander. */
	private announce(event: TurnChangedEvent): void {
		if (event.phase === UnitFaction.PLAYER) {
			this.focusCommander();
		}

		this.stateManager.getState(PhaseBannerState).request({ turn: event.number, faction: event.phase });
		this.stateManager.push(PhaseBannerState);
	}

	/** Drops the map cursor onto the commander, if both are on the map. */
	private focusCommander(): void {
		const commander = this.world.entityWith(CommanderComponent);

		if (commander === null || !commander.hasComponent(GridPositionComponent)) {
			return;
		}

		moveCursorTo(activeCursor(this.world), commander.getComponent(GridPositionComponent).read());
	}
}
