import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { pressed, pressedOrHeld } from "@/core/input/commands/InputBindings";
import { cancelBinding, confirmBinding, DOWN, LEFT, RIGHT, UP } from "@/game/input/Controls";
import { OptionsComponent } from "@/game/options/components/OptionsComponent";
import { gameSettings } from "@/game/options/GameSettings";

/** Milliseconds a direction is held before the row cursor starts repeating - the menu's own feel. */
const REPEAT_DELAY = 300;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 90;

/** What an options command is handed each tick. */
export interface OptionsCommandContext {
	/** Entity carrying the open options screen. */
	options: Entity;
}

/** Input the player can trigger on the options screen: picking a row, changing it, closing. */
export abstract class OptionsCommand extends GameCommand<OptionsCommandContext> {}

/** Steps the highlighted row by `step`, wrapping around the list the way a menu does. */
abstract class MoveOptionsCursorCommand extends OptionsCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding, { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { options }: OptionsCommandContext): void {
		const component = options.getComponent(OptionsComponent);
		const data = component.read();

		if (data.optionIds.length === 0) {
			return;
		}

		const selectedIndex = (data.selectedIndex + this.step + data.optionIds.length) % data.optionIds.length;
		component.update({ ...data, selectedIndex });
	}
}

export class OptionsUpCommand extends MoveOptionsCursorCommand {
	constructor() {
		super(-1, pressedOrHeld(UP));
	}
}

export class OptionsDownCommand extends MoveOptionsCursorCommand {
	constructor() {
		super(1, pressedOrHeld(DOWN));
	}
}

/**
 * Steps the highlighted setting to its next or previous choice. It is written
 * straight to the [[OptionsService]] rather than held on the screen, so the
 * change takes effect under the cursor - a language switch relabels the row it
 * was made on.
 *
 * No repeat policy: a setting has a handful of choices, and a held key that
 * spun through them would be more likely to overshoot than to help.
 */
abstract class CycleOptionCommand extends OptionsCommand {
	constructor(
		private readonly step: number,
		binding: InputBinding
	) {
		super(binding);
	}

	protected action(_elapsed: number, _frame: number, { options }: OptionsCommandContext): void {
		const data = options.getComponent(OptionsComponent).read();
		const id = data.optionIds[data.selectedIndex];

		if (id !== undefined) {
			gameSettings().cycle(id, this.step);
		}
	}
}

export class OptionsPreviousCommand extends CycleOptionCommand {
	constructor() {
		super(-1, pressed(LEFT));
	}
}

export class OptionsNextCommand extends CycleOptionCommand {
	constructor() {
		super(1, pressed(RIGHT));
	}
}

/**
 * Closes the screen. Confirm and cancel both do it: every change has already
 * been applied, so there is no "OK" to press and nothing to back out of.
 */
abstract class CloseOptionsCommand extends OptionsCommand {
	protected action(_elapsed: number, _frame: number, { options }: OptionsCommandContext): void {
		const component = options.getComponent(OptionsComponent);
		component.update({ ...component.read(), closed: true });
	}
}

export class OptionsConfirmCommand extends CloseOptionsCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class OptionsCancelCommand extends CloseOptionsCommand {
	constructor() {
		super(cancelBinding());
	}
}

/** The options commands as one list, so the state allowing them and the feature registering them stay in step. */
export const optionsCommands: GameCommandConstructor[] = [OptionsUpCommand, OptionsDownCommand, OptionsPreviousCommand, OptionsNextCommand, OptionsConfirmCommand, OptionsCancelCommand];
