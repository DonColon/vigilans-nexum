import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { StaffCommand } from "@/game/staff/commands/StaffCommands";
import { StaffChoiceComponent, StaffChoiceData } from "@/game/staff/components/StaffChoiceComponent";
import { StaffState } from "@/game/staff/states/StaffState";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { moveCursorTo } from "@/game/map/model/MapCursor";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { isPartnerResolved, reconcilePartner } from "@/game/units/model/PartnerChoice";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Drives the "who am I healing?" step: it runs the cycling commands and parks
 * the map cursor on the ally being pointed at, so the player reads the choice
 * off the map rather than off a list. Confirm reports `staff:confirmed` and the
 * heal feature raises the staff; cancel puts the cursor back and reports
 * `staff:cancelled`.
 */
export class StaffChoiceSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof StaffState)) {
			return;
		}

		const entity = state.getChoice();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(StaffChoiceComponent);
		this.reconcile(component);

		const data = component.read();

		if (data.cancelled) {
			this.restoreCursor(data);
			this.stateManager.pop();
			this.eventSystem.dispatch("staff:cancelled", { unitId: data.unitId });
			return;
		}

		if (data.confirmed) {
			// The cursor goes back before the staff is raised: the number floating
			// over the ally is what the player reads now, and the healer is spent
			// where it stands.
			this.restoreCursor(data);
			this.stateManager.pop();
			this.eventSystem.dispatch("staff:confirmed", { unitId: data.unitId, targetId: data.partnerId, staffId: data.staffId });
			return;
		}

		this.runCommands(elapsed, frame, state, entity);
		this.parkCursor(component.read());
	}

	/** Snaps `partnerId` to whichever ally is pointed at now, before anything acts on it. */
	private reconcile(component: StaffChoiceComponent): void {
		const data = component.read();

		if (!isPartnerResolved(data)) {
			component.update({ ...data, ...reconcilePartner(data) });
		}
	}

	/** Keeps the map cursor on whoever is about to be healed. */
	private parkCursor(data: StaffChoiceData): void {
		const target = UnitSystem.byId(this.queries.units.getResult(), data.partnerId);

		if (target !== null) {
			moveCursorTo(this.queries.cursors.getSingleResult(), UnitSystem.tileOf(target));
		}
	}

	private restoreCursor(data: StaffChoiceData): void {
		moveCursorTo(this.queries.cursors.getSingleResult(), { column: data.restoreColumn, row: data.restoreRow });
	}

	private runCommands(elapsed: number, frame: number, state: StaffState, choice: Entity): void {
		for (const command of state.getCommands(StaffCommand)) {
			command.execute(elapsed, frame, { choice });
		}
	}
}
