import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputSet, pressed } from "@/core/input/commands/InputBindings";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { TalkChoiceComponent } from "@/game/talk/components/TalkChoiceComponent";
import { cyclePartner } from "@/game/units/model/PartnerChoice";

/**
 * Cycling takes any direction but stays on the d-pad rather than the shared
 * direction sets - the same choice the battle forecast and the trade screen make
 * for pointing at a unit: the left stick is too easy to nudge.
 */
const NEXT_PARTNER: InputSet = { keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_D, KeyboardInput.KEY_S], buttons: [GamepadInput.DPAD_RIGHT, GamepadInput.DPAD_DOWN] };
const PREVIOUS_PARTNER: InputSet = { keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.ARROW_UP, KeyboardInput.KEY_A, KeyboardInput.KEY_W], buttons: [GamepadInput.DPAD_LEFT, GamepadInput.DPAD_UP] };

/** What a talk command is handed each tick. */
export interface TalkCommandContext {
	/** Entity carrying the open "who am I talking to?" choice. */
	choice: Entity;
}

/** Input the player can trigger while picking who to talk to. */
export abstract class TalkCommand extends GameCommand<TalkCommandContext> {}

/** Steps the pointed-at partner by `step`, wrapping around the list. The map cursor follows. */
abstract class CyclePartnerCommand extends TalkCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding);
	}

	protected action(_elapsed: number, _frame: number, { choice }: TalkCommandContext): void {
		const component = choice.getComponent(TalkChoiceComponent);
		const data = component.read();

		component.update({ ...data, ...cyclePartner(data, this.step) });
	}
}

export class TalkNextPartnerCommand extends CyclePartnerCommand {
	constructor() {
		super(1, pressed(NEXT_PARTNER));
	}
}

export class TalkPrevPartnerCommand extends CyclePartnerCommand {
	constructor() {
		super(-1, pressed(PREVIOUS_PARTNER));
	}
}

/** Settles on the unit the cursor is pointing at - the conversation with them starts. */
export class TalkConfirmCommand extends TalkCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { choice }: TalkCommandContext): void {
		const component = choice.getComponent(TalkChoiceComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/** Backs out without talking to anyone. */
export class TalkCancelCommand extends TalkCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { choice }: TalkCommandContext): void {
		const component = choice.getComponent(TalkChoiceComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The commands as one list, so the state allowing them and the feature registering them stay in step. */
export const talkCommands: GameCommandConstructor[] = [TalkNextPartnerCommand, TalkPrevPartnerCommand, TalkConfirmCommand, TalkCancelCommand];
