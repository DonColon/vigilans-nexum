import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { ExperienceComponent, ExperiencePhase } from "@/game/experience/components/ExperienceComponent";
import { levelUpDuration, levelUpFrame } from "@/game/experience/view/LevelUpPanel";

/** What an experience command is handed each tick. */
export interface ExperienceCommandContext {
	/** Entity carrying the experience display. */
	display: Entity;
}

/**
 * Input the player can trigger while the experience display is up. The bar
 * takes no input at all; the level-up panel takes one press, twice. Listed by
 * ExperienceState, run by ExperienceSystem.
 */
export abstract class ExperienceCommand extends GameCommand<ExperienceCommandContext> {}

/**
 * A press on the level-up panel: while the stats are still lighting up it
 * skips to the end, with every gain on show - Fire Emblem lets an impatient
 * player hurry the level along - and once everything is on show it takes the
 * panel down. Confirm and cancel both do it; there is nothing to back out of.
 *
 * Like the popup commands it never pops the state itself; it marks the display
 * and ExperienceSystem tears it down on the next tick.
 */
abstract class AdvanceLevelUpCommand extends ExperienceCommand {
	protected action(_elapsed: number, _frame: number, { display }: ExperienceCommandContext): void {
		const component = display.getComponent(ExperienceComponent);
		const data = component.read();

		if (data.phase !== ExperiencePhase.LEVEL_UP) {
			return;
		}

		if (levelUpFrame(data, data.elapsed).complete) {
			component.update({ ...data, closed: true });
		} else {
			component.update({ ...data, elapsed: levelUpDuration(data) });
		}
	}
}

export class ConfirmLevelUpCommand extends AdvanceLevelUpCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class CancelLevelUpCommand extends AdvanceLevelUpCommand {
	constructor() {
		super(cancelBinding());
	}
}

/** The experience commands as one list, so the state allowing them and the feature registering them stay in step. */
export const experienceCommands: GameCommandConstructor[] = [ConfirmLevelUpCommand, CancelLevelUpCommand];
