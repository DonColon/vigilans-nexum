import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputSet, pressedOrHeld } from "@/core/input/commands/InputBindings";
import { cancelBinding, confirmBinding, DOWN, UP } from "@/game/input/Controls";
import { SaveSlotComponent } from "@/game/campaign/components/SaveSlotComponent";

/** Milliseconds a direction is held before the highlight starts repeating - the menu's own feel. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

/** What a save slot command is handed each tick. */
export interface SaveSlotCommandContext {
	/** Entity carrying the slot list. */
	slots: Entity;
}

/**
 * Input the player can trigger while the save slot list is up: moving down
 * it, choosing a slot, and backing out to the title menu. Listed by
 * [[SaveSlotState]], run by CampaignSystem, which reports the presses.
 */
export abstract class SaveSlotCommand extends GameCommand<SaveSlotCommandContext> {}

/** Steps the highlight by `step`, wrapping around the list the way a menu does. */
abstract class MoveSlotHighlightCommand extends SaveSlotCommand {
	constructor(
		private readonly step: number,
		input: InputSet
	) {
		super(pressedOrHeld(input), { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { slots }: SaveSlotCommandContext): void {
		const component = slots.getComponent(SaveSlotComponent);
		const data = component.read();

		if (data.slots.length === 0) {
			return;
		}

		component.update({ ...data, selectedIndex: (data.selectedIndex + this.step + data.slots.length) % data.slots.length });
	}
}

export class SaveSlotUpCommand extends MoveSlotHighlightCommand {
	constructor() {
		super(-1, UP);
	}
}

export class SaveSlotDownCommand extends MoveSlotHighlightCommand {
	constructor() {
		super(1, DOWN);
	}
}

/** Chooses the highlighted slot. Only marked here; what it means is the flow's, by the list's purpose. */
export class SaveSlotConfirmCommand extends SaveSlotCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { slots }: SaveSlotCommandContext): void {
		const component = slots.getComponent(SaveSlotComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

/** Backs out to the title menu. */
export class SaveSlotCancelCommand extends SaveSlotCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { slots }: SaveSlotCommandContext): void {
		const component = slots.getComponent(SaveSlotComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The save slot commands as one list, so the state allowing them and the feature registering them stay in step. */
export const saveSlotCommands: GameCommandConstructor[] = [SaveSlotUpCommand, SaveSlotDownCommand, SaveSlotConfirmCommand, SaveSlotCancelCommand];
