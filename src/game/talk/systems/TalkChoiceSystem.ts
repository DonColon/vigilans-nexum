import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { moveCursorTo } from "@/game/map/model/MapCursor";
import { TalkCommand } from "@/game/talk/commands/TalkCommands";
import { TalkChoiceComponent, TalkChoiceData } from "@/game/talk/components/TalkChoiceComponent";
import { TalkState } from "@/game/talk/states/TalkState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { isPartnerResolved, reconcilePartner } from "@/game/units/model/PartnerChoice";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Drives the "who am I talking to?" step: it runs the cycling commands and parks
 * the map cursor on the unit being pointed at, so the player reads the choice off
 * the map rather than off a list. Confirm reports `talk:confirmed` and the talk
 * feature plays the conversation; cancel puts the cursor back and reports
 * `talk:cancelled`.
 */
export class TalkChoiceSystem extends UpdateSystem {
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

		if (!(state instanceof TalkState)) {
			return;
		}

		const entity = state.getChoice();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(TalkChoiceComponent);
		this.reconcile(component);

		const data = component.read();

		if (data.cancelled) {
			this.restoreCursor(data);
			this.stateManager.pop();
			this.eventSystem.dispatch("talk:cancelled", { unitId: data.unitId });
			return;
		}

		if (data.confirmed) {
			// The cursor goes back before the conversation opens: the textbox is what
			// the player reads now, and the unit's command menu comes back beside it
			// once the two are done.
			this.restoreCursor(data);
			this.stateManager.pop();
			this.eventSystem.dispatch("talk:confirmed", { unitId: data.unitId, partnerId: data.partnerId });
			return;
		}

		this.runCommands(elapsed, frame, state, entity);
		this.parkCursor(component.read());
	}

	/** Snaps `partnerId` to whichever unit is pointed at now, before anything acts on it. */
	private reconcile(component: TalkChoiceComponent): void {
		const data = component.read();

		if (!isPartnerResolved(data)) {
			component.update({ ...data, ...reconcilePartner(data) });
		}
	}

	/** Keeps the map cursor on whoever is about to be spoken to. */
	private parkCursor(data: TalkChoiceData): void {
		const partner = UnitSystem.byId(this.queries.units.getResult(), data.partnerId);

		if (partner !== null) {
			moveCursorTo(this.queries.cursors.getSingleResult(), UnitSystem.tileOf(partner));
		}
	}

	private restoreCursor(data: TalkChoiceData): void {
		moveCursorTo(this.queries.cursors.getSingleResult(), { column: data.restoreColumn, row: data.restoreRow });
	}

	private runCommands(elapsed: number, frame: number, state: TalkState, choice: Entity): void {
		for (const command of state.getCommands(TalkCommand)) {
			command.execute(elapsed, frame, { choice });
		}
	}
}
