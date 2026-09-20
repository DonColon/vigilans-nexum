import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChapterCardCommand } from "@/game/campaign/commands/ChapterCardCommands";
import { SaveSlotCommand } from "@/game/campaign/commands/SaveSlotCommands";
import { CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { ChapterCardComponent } from "@/game/campaign/components/ChapterCardComponent";
import { SaveSlotComponent } from "@/game/campaign/components/SaveSlotComponent";
import { TitleComponent } from "@/game/campaign/components/TitleComponent";
import { ChapterCardState } from "@/game/campaign/states/ChapterCardState";
import { SaveSlotState } from "@/game/campaign/states/SaveSlotState";
import { TitleState } from "@/game/campaign/states/TitleState";
import { MapState } from "@/game/map/states/MapState";

/**
 * Runs the campaign's screens while one of them is on the stack, and the
 * run's clock:
 *
 *  - The title screen's clock, for its fade in. Its menu is the UI feature's
 *    and runs itself.
 *  - The save slot list's commands; a chosen slot is reported as
 *    `campaign:slotChosen` for the flow to act on, a cancel as
 *    `campaign:slotsClosed` and the list comes down.
 *  - The chapter card's clock and its acknowledge command; acknowledged, the
 *    chapter's battle is entered - the map state is told which scenario and
 *    tile map to build and switched to, which tears the card down and sets
 *    the battle up (`map:ready`).
 *  - The playtime of the run under way, whatever screen is up: every frame
 *    with a [[CampaignComponent]] in the world counts.
 *
 * Sits with the other screens' systems in the update schedule.
 */
export class CampaignSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private events!: EventBus;

	@GameCoreService(World)
	private world!: World;

	public initialize(): this {
		return this;
	}

	public execute(elapsed: number, frame: number): void {
		this.keepTime(elapsed);

		const state = this.stateManager.peek();

		if (state instanceof ChapterCardState) {
			this.runCard(state, elapsed, frame);
			return;
		}

		if (state instanceof SaveSlotState) {
			this.runSlots(state, elapsed, frame);
		}

		// The title's clock keeps running under its menu or the slot list, which
		// is what is on top once the store has answered.
		const title = this.stateManager.getCurrentStates().find((current) => current instanceof TitleState);

		if (title instanceof TitleState) {
			const screen = title.getScreen();

			if (screen !== null) {
				const component = screen.getComponent(TitleComponent);
				component.update(TitleComponent.advanced(component.read(), elapsed));
			}
		}
	}

	/** Another frame of the run under way. */
	private keepTime(elapsed: number): void {
		const run = this.world.entityWith(CampaignComponent);

		if (run !== null) {
			const component = run.getComponent(CampaignComponent);
			component.update(CampaignComponent.played(component.read(), elapsed));
		}
	}

	private runSlots(state: SaveSlotState, elapsed: number, frame: number): void {
		const entity = state.getSlots();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(SaveSlotComponent);
		const data = component.read();

		if (data.cancelled) {
			this.events.dispatch("campaign:slotsClosed", {});
			this.stateManager.pop();
			return;
		}

		if (data.confirmed) {
			component.update({ ...data, confirmed: false });

			// A slot that cannot be chosen for what the list is for - an empty one
			// to continue - is left where it is.
			if (SaveSlotComponent.canChoose(data)) {
				const slot = SaveSlotComponent.selected(data);

				if (slot !== null) {
					this.events.dispatch("campaign:slotChosen", { purpose: data.purpose, slot: slot.slot });
				}
			}

			return;
		}

		for (const command of state.getCommands(SaveSlotCommand)) {
			command.execute(elapsed, frame, { slots: entity });
		}
	}

	private runCard(state: ChapterCardState, elapsed: number, frame: number): void {
		const entity = state.getCard();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(ChapterCardComponent);
		const data = component.read();

		if (data.acknowledged) {
			// Resolved by type, so a spec can stand in a stub for the real map; only
			// the real one is told what to build.
			const map = this.stateManager.getState(MapState.type);

			if (map instanceof MapState) {
				map.request({ scenario: data.chapter, map: data.map });
			}

			this.stateManager.switch(MapState.type);
			return;
		}

		component.update(ChapterCardComponent.advanced(data, elapsed));

		for (const command of state.getCommands(ChapterCardCommand)) {
			command.execute(elapsed, frame, { card: entity });
		}
	}
}
