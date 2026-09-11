import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputSet, pressed } from "@/core/input/commands/InputBindings";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { StaffChoiceComponent } from "@/game/staff/components/StaffChoiceComponent";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { cyclePartner } from "@/game/units/model/PartnerChoice";

/**
 * Cycling takes any direction but stays on the d-pad rather than the shared
 * direction sets - the same choice the talk, the trade screen and the battle
 * forecast make for pointing at a unit: the left stick is too easy to nudge.
 */
const NEXT_TARGET: InputSet = { keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_D, KeyboardInput.KEY_S], buttons: [GamepadInput.DPAD_RIGHT, GamepadInput.DPAD_DOWN] };
const PREVIOUS_TARGET: InputSet = { keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.ARROW_UP, KeyboardInput.KEY_A, KeyboardInput.KEY_W], buttons: [GamepadInput.DPAD_LEFT, GamepadInput.DPAD_UP] };

/** What a heal command is handed each tick. */
export interface StaffCommandContext {
	/** Entity carrying the open "who am I healing?" choice. */
	choice: Entity;
}

/** Input the player can trigger while picking who to heal. */
export abstract class StaffCommand extends GameCommand<StaffCommandContext> {}

/** Steps the pointed-at ally by `step`, wrapping around the list. The map cursor follows. */
abstract class CycleTargetCommand extends StaffCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding);
	}

	protected action(_elapsed: number, _frame: number, { choice }: StaffCommandContext): void {
		const component = choice.getComponent(StaffChoiceComponent);
		const data = component.read();

		component.update({ ...data, ...cyclePartner(data, this.step) });
	}
}

export class StaffNextTargetCommand extends CycleTargetCommand {
	constructor() {
		super(1, pressed(NEXT_TARGET));
	}
}

export class StaffPrevTargetCommand extends CycleTargetCommand {
	constructor() {
		super(-1, pressed(PREVIOUS_TARGET));
	}
}

/** Settles on the ally the cursor is pointing at - the staff is raised over them. */
export class StaffConfirmCommand extends StaffCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { choice }: StaffCommandContext): void {
		const component = choice.getComponent(StaffChoiceComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/** Backs out without healing anyone. */
export class StaffCancelCommand extends StaffCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { choice }: StaffCommandContext): void {
		const component = choice.getComponent(StaffChoiceComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The commands as one list, so the state allowing them and the feature registering them stay in step. */
export const staffCommands: GameCommandConstructor[] = [StaffNextTargetCommand, StaffPrevTargetCommand, StaffConfirmCommand, StaffCancelCommand];
