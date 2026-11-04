import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { moveCursorTo } from "@/game/map/rules/MapCursor";
import { PositionalCommand } from "@/game/positional/commands/PositionalCommands";
import { PositionalChoiceComponent, PositionalChoiceData } from "@/game/positional/components/PositionalChoiceComponent";
import { PositionalState } from "@/game/positional/states/PositionalState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { isPartnerResolved, reconcilePartner } from "@/game/units/rules/PartnerChoice";
import { tileOf, unitById } from "@/game/units/rules/UnitLookup";

/**
 * Drives the "who am I moving?" step: it runs the cycling commands and parks
 * the map cursor on the unit being pointed at, so the player reads the choice
 * off the map - together with the wash [[PositionalRenderSystem]] puts where
 * that unit would land. Confirm puts the cursor back on the user and reports
 * `positional:confirmed`, on which the flow slides the pieces; cancel puts it
 * back and reports `positional:cancelled`.
 */
export class PositionalChoiceSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private eventBus!: EventBus;

	public initialize(): this {
		this.queries = {
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] })
		};

		return this;
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof PositionalState)) {
			return;
		}

		const entity = state.getChoice();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(PositionalChoiceComponent);
		this.reconcile(component);

		const data = component.read();

		if (data.cancelled) {
			this.restoreCursor(data);
			this.stateManager.pop();
			this.eventBus.dispatch("positional:cancelled", { unitId: data.unitId });
			return;
		}

		if (data.confirmed) {
			// The cursor goes back to the user before anything moves: it is the
			// user's tile the turn ends on, wherever the pieces slide.
			this.restoreCursor(data);
			this.stateManager.pop();
			this.eventBus.dispatch("positional:confirmed", { unitId: data.unitId, ability: data.ability, targetId: data.partnerId });
			return;
		}

		this.runCommands(elapsed, frame, state, entity);
		this.parkCursor(component.read());
	}

	/** Snaps `partnerId` to whichever unit is pointed at now, before anything acts on it. */
	private reconcile(component: PositionalChoiceComponent): void {
		const data = component.read();

		if (!isPartnerResolved(data)) {
			component.update({ ...data, ...reconcilePartner(data) });
		}
	}

	/** Keeps the map cursor on whoever is about to be moved. */
	private parkCursor(data: PositionalChoiceData): void {
		const target = unitById(this.queries.units.getResult(), data.partnerId);

		if (target !== null) {
			moveCursorTo(this.queries.cursors.getSingleResult(), tileOf(target));
		}
	}

	private restoreCursor(data: PositionalChoiceData): void {
		moveCursorTo(this.queries.cursors.getSingleResult(), { column: data.restoreColumn, row: data.restoreRow });
	}

	private runCommands(elapsed: number, frame: number, state: PositionalState, choice: Entity): void {
		for (const command of state.getCommands(PositionalCommand)) {
			command.execute(elapsed, frame, { choice });
		}
	}
}
