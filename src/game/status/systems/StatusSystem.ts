import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { StatusCommand } from "@/game/status/commands/StatusCommands";
import { StatusComponent, StatusData } from "@/game/status/components/StatusComponent";
import { StatusState } from "@/game/status/states/StatusState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Drives the open unit sheet: it runs the commands the StatusState allows and,
 * once one of them has marked the sheet closed, reports it and pops the state.
 *
 * Paging to another unit moves the map cursor onto it, Fire Emblem style: the
 * sheets are read in map order, and closing the screen leaves the cursor on
 * whoever was last looked at rather than snapping back to where it was.
 *
 * One sheet at a time; the unit the player is looking at is the only one there is.
 */
export class StatusSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			statuses: new Query({ allowlist: [StatusComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] }),
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const entity = this.queries.statuses.getSingleResult();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(StatusComponent);
		const before = component.read();

		if (before.closed) {
			// Reported before the pop takes the entity with it, and carrying the
			// unit, because the event is delivered a tick later - by then there is
			// no sheet left to ask.
			this.eventSystem.dispatch("status:closed", { unitId: StatusSystem.shownUnit(before) });
			this.stateManager.pop();
			return;
		}

		// The commands come from the state on top of the stack. If that is not this
		// StatusState the page just sits there, the same way the map waits under it.
		const state = this.stateManager.peek();

		if (!(state instanceof StatusState)) {
			return;
		}

		for (const command of state.getCommands(StatusCommand)) {
			command.execute(elapsed, frame, { status: entity });
		}

		const after = component.read();

		if (after.index !== before.index) {
			this.followUnit(StatusSystem.shownUnit(after));
		}
	}

	/** Id of the unit whose sheet is up, or "" for an empty list. */
	public static shownUnit(data: StatusData): string {
		return data.unitIds[data.index] ?? "";
	}

	/** Puts the map cursor on the unit's tile - the one the player has just paged to. */
	private followUnit(unitId: string): void {
		const cursor = this.queries.cursors.getSingleResult();
		const unit = UnitSystem.byId(this.queries.units.getResult(), unitId);

		if (cursor === null || unit === null) {
			return;
		}

		cursor.getComponent(GridPositionComponent).update({ ...UnitSystem.tileOf(unit) });
	}
}
