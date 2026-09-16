import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { ObjectiveScreenComponent } from "@/game/objective/components/ObjectiveScreenComponent";

/** What an objective screen command is handed each tick. */
export interface ObjectiveScreenCommandContext {
	/** Entity carrying the open screen. */
	screen: Entity;
}

/**
 * Input the player can trigger while the objective screen is up. It is a
 * readout with nothing on it to choose, so closing it is the whole vocabulary.
 * Listed by ObjectiveScreenState, run by ObjectiveScreenSystem.
 */
export abstract class ObjectiveScreenCommand extends GameCommand<ObjectiveScreenCommandContext> {}

/**
 * Closes the screen. Confirm and cancel both do it - a player reaching for
 * either should not have to find the other. Like the roster's close it marks
 * the screen and lets ObjectiveScreenSystem tear it down on the next tick.
 */
abstract class CloseObjectiveScreenCommand extends ObjectiveScreenCommand {
	protected action(_elapsed: number, _frame: number, { screen }: ObjectiveScreenCommandContext): void {
		const component = screen.getComponent(ObjectiveScreenComponent);
		component.update({ ...component.read(), closed: true });
	}
}

export class ConfirmObjectiveScreenCommand extends CloseObjectiveScreenCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class CancelObjectiveScreenCommand extends CloseObjectiveScreenCommand {
	constructor() {
		super(cancelBinding());
	}
}

/** The objective screen commands as one list, so the state allowing them and the feature registering them stay in step. */
export const objectiveScreenCommands: GameCommandConstructor[] = [ConfirmObjectiveScreenCommand, CancelObjectiveScreenCommand];
