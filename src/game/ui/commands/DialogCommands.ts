import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState } from "@/core/input/InputState";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { DialogComponent } from "@/game/ui/components/DialogComponent";
import { DialogCommand, DialogCommandContext } from "@/game/ui/commands/UICommand";

/** Keys and buttons that mean "yes, go on" across the whole UI. */
export function confirmBinding(): InputBinding {
	const keys = [KeyboardInput.ENTER, KeyboardInput.SPACE, KeyboardInput.KEY_Z, KeyboardInput.NUMPAD_ENTER];
	const buttons = [GamepadInput.A];

	return new InputBinding({
		and: false,
		bindings: [
			...keys.map((input) => new InputBinding({ channel: InputChannel.KEYBOARD, input, state: InputState.JUST_PRESSED })),
			...buttons.map((input) => new InputBinding({ channel: InputChannel.GAMEPAD, input, state: InputState.JUST_PRESSED }))
		]
	});
}

/**
 * One press does the next sensible thing for a textbox:
 *
 *  - a page still revealing itself      -> show the rest of it at once
 *  - a fully shown page with more to come -> turn to the next page
 *  - the last page, fully shown           -> close the box
 *
 * The command never pops the state itself; it marks the dialog and the
 * DialogSystem tears it down on the next tick, the same way MenuSystem does.
 */
export class AdvanceDialogCommand extends DialogCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { dialog, fullyRevealed }: DialogCommandContext): void {
		const component = dialog.getComponent(DialogComponent);
		const data = component.read();

		if (!fullyRevealed) {
			component.update({ ...data, revealAll: true });
			return;
		}

		if (data.pageIndex < data.pages.length - 1) {
			component.update({ ...data, pageIndex: data.pageIndex + 1, pageElapsed: 0, revealAll: false });
			return;
		}

		component.update({ ...data, closed: true });
	}
}

/** The dialog commands as one list, so the state allowing them and the feature registering them stay in step. */
export const dialogCommands: GameCommandConstructor[] = [AdvanceDialogCommand];
