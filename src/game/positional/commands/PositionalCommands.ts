import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputSet, pressed } from "@/core/input/commands/InputBindings";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { PositionalChoiceComponent } from "@/game/positional/components/PositionalChoiceComponent";
import { cyclePartner } from "@/game/units/rules/PartnerChoice";

/**
 * Cycling takes any direction but stays on the d-pad rather than the shared
 * direction sets - the same choice a talk and a staff make for pointing at a
 * unit: the left stick is too easy to nudge.
 */
const NEXT_TARGET: InputSet = { keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_D, KeyboardInput.KEY_S], buttons: [GamepadInput.DPAD_RIGHT, GamepadInput.DPAD_DOWN] };
const PREVIOUS_TARGET: InputSet = { keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.ARROW_UP, KeyboardInput.KEY_A, KeyboardInput.KEY_W], buttons: [GamepadInput.DPAD_LEFT, GamepadInput.DPAD_UP] };

/** What a positional command is handed each tick. */
export interface PositionalCommandContext {
	/** Entity carrying the open "who am I moving?" choice. */
	choice: Entity;
}

/** Input the player can trigger while picking who to move. Listed by PositionalState, run by PositionalChoiceSystem. */
export abstract class PositionalCommand extends GameCommand<PositionalCommandContext> {}

/** Steps the pointed-at target by `step`, wrapping around the list. The map cursor follows. */
abstract class CycleTargetCommand extends PositionalCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding);
	}

	protected action(_elapsed: number, _frame: number, { choice }: PositionalCommandContext): void {
		const component = choice.getComponent(PositionalChoiceComponent);
		const data = component.read();

		component.update({ ...data, ...cyclePartner(data, this.step) });
	}
}

export class PositionalNextTargetCommand extends CycleTargetCommand {
	constructor() {
		super(1, pressed(NEXT_TARGET));
	}
}

export class PositionalPrevTargetCommand extends CycleTargetCommand {
	constructor() {
		super(-1, pressed(PREVIOUS_TARGET));
	}
}

/** Settles on the unit the cursor is pointing at - the pieces slide. */
export class PositionalConfirmCommand extends PositionalCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { choice }: PositionalCommandContext): void {
		const component = choice.getComponent(PositionalChoiceComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/** Backs out without moving anyone. */
export class PositionalCancelCommand extends PositionalCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { choice }: PositionalCommandContext): void {
		const component = choice.getComponent(PositionalChoiceComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The commands as one list, so the state allowing them and the feature registering them stay in step. */
export const positionalCommands: GameCommandConstructor[] = [PositionalNextTargetCommand, PositionalPrevTargetCommand, PositionalConfirmCommand, PositionalCancelCommand];
