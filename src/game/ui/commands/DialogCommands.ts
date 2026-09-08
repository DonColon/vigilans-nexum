import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { confirmBinding } from "@/game/input/Controls";
import { DialogComponent } from "@/game/ui/components/DialogComponent";
import { DialogCommand, DialogCommandContext } from "@/game/ui/commands/UICommand";

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
