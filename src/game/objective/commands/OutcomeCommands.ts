import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
import { outcomeAcceptsPress } from "@/game/objective/view/OutcomeBanner";

/** What an outcome command is handed each tick. */
export interface OutcomeCommandContext {
	/** Entity carrying the banner. */
	outcome: Entity;
}

/**
 * Input the player can trigger while the outcome banner is up. There is one
 * thing to do with it - acknowledge it - so this is the whole vocabulary.
 * Listed by OutcomeState, run by ObjectiveSystem.
 */
export abstract class OutcomeCommand extends GameCommand<OutcomeCommandContext> {}

/**
 * Acknowledges the banner. Confirm and cancel both do it - there is nothing
 * to back out of - but neither counts until the banner has been up long
 * enough to be read, so a press left over from the last fight does not skip
 * it. It never pops the state itself; it marks the banner and
 * ObjectiveSystem takes it from there.
 */
abstract class AcknowledgeOutcomeCommand extends OutcomeCommand {
	protected action(_elapsed: number, _frame: number, { outcome }: OutcomeCommandContext): void {
		const component = outcome.getComponent(OutcomeComponent);
		const data = component.read();

		if (outcomeAcceptsPress(data.elapsed)) {
			component.update({ ...data, acknowledged: true });
		}
	}
}

export class ConfirmOutcomeCommand extends AcknowledgeOutcomeCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class CancelOutcomeCommand extends AcknowledgeOutcomeCommand {
	constructor() {
		super(cancelBinding());
	}
}

/** The outcome commands as one list, so the state allowing them and the feature registering them stay in step. */
export const outcomeCommands: GameCommandConstructor[] = [ConfirmOutcomeCommand, CancelOutcomeCommand];
