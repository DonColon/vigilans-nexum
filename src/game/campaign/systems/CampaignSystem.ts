import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChapterCardCommand } from "@/game/campaign/commands/ChapterCardCommands";
import { ChapterCardComponent } from "@/game/campaign/components/ChapterCardComponent";
import { TitleComponent } from "@/game/campaign/components/TitleComponent";
import { ChapterCardState } from "@/game/campaign/states/ChapterCardState";
import { TitleState } from "@/game/campaign/states/TitleState";
import { MapState } from "@/game/map/states/MapState";

/**
 * Runs the campaign's two screens while one of them is on the stack:
 *
 *  - The title screen's clock, for its fade in. Its menu is the UI feature's
 *    and runs itself.
 *  - The chapter card's clock and its acknowledge command; acknowledged, the
 *    chapter's battle is entered - the map state is told which scenario and
 *    tile map to build and switched to, which tears the card down and sets
 *    the battle up (`map:ready`).
 *
 * Sits with the other screens' systems in the update schedule.
 */
export class CampaignSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	public initialize(): this {
		return this;
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (state instanceof ChapterCardState) {
			this.runCard(state, elapsed, frame);
			return;
		}

		// The title's clock keeps running under its menu, which is what is on top
		// once the store has answered.
		const title = this.stateManager.getCurrentStates().find((current) => current instanceof TitleState);

		if (title instanceof TitleState) {
			const screen = title.getScreen();

			if (screen !== null) {
				const component = screen.getComponent(TitleComponent);
				component.update(TitleComponent.advanced(component.read(), elapsed));
			}
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
