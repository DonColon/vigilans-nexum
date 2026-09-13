import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ExperienceCommand } from "@/game/experience/commands/ExperienceCommands";
import { ExperienceComponent, ExperiencePhase } from "@/game/experience/components/ExperienceComponent";
import { experienceFrame } from "@/game/experience/view/ExperienceBar";
import { levelUpDuration } from "@/game/experience/view/LevelUpPanel";
import { ExperienceState } from "@/game/experience/states/ExperienceState";
import { OptionId } from "@/game/options/content/GameOptions";
import { optionEnabled } from "@/game/options/GameSettings";

/**
 * Runs the experience display: advances the clock on the
 * [[ExperienceComponent]] while the bar fills and, once every point is in,
 * either hands over to the level-up panel - the clock starts again for it, and
 * the player's presses hurry it along and then take it down - or lets the bar
 * hold a moment and go. Either way the end pops the [[ExperienceState]] and
 * reports `experience:shown`.
 *
 * The points and the level are already on the unit - the feature put them
 * there before pushing the state. This only paces the *showing*.
 */
export class ExperienceSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private eventBus!: EventBus;

	public initialize(): void {}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof ExperienceState)) {
			return;
		}

		const entity = state.getDisplay();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(ExperienceComponent);
		const data = component.read();

		if (data.phase === ExperiencePhase.LEVEL_UP) {
			component.update({ ...data, elapsed: data.elapsed + elapsed });

			for (const command of state.getCommands(ExperienceCommand)) {
				command.execute(elapsed, frame, { display: entity });
			}

			if (component.read().closed) {
				this.finish(data.unitId);
			}

			return;
		}

		const now = data.elapsed + elapsed;
		const bar = experienceFrame(data, now);

		if (!bar.filled) {
			component.update({ ...data, elapsed: now });
			return;
		}

		if (data.toLevel > 0) {
			// The bar is done; the level-up panel takes over with a clock of its own.
			// With animations off it starts with every gain already on show.
			const skipped = optionEnabled(OptionId.BATTLE_ANIMATIONS) ? 0 : levelUpDuration(data);

			component.update({ ...data, elapsed: skipped, phase: ExperiencePhase.LEVEL_UP });
			return;
		}

		component.update({ ...data, elapsed: now });

		if (bar.done) {
			this.finish(data.unitId);
		}
	}

	private finish(unitId: string): void {
		this.stateManager.pop();
		this.eventBus.dispatch("experience:shown", { unitId });
	}
}
