import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { PopupCommand, PopupCommandContext } from "@/game/ui/commands/UICommand";

/**
 * Acknowledges the notice. Confirm and cancel both do it - there is nothing to
 * back out of, and a player who reaches for either should not have to look for
 * the other.
 *
 * Like the dialog commands it never pops the state itself; it marks the popup
 * and PopupSystem tears it down on the next tick.
 */
abstract class DismissPopupCommand extends PopupCommand {
	protected action(_elapsed: number, _frame: number, { popup }: PopupCommandContext): void {
		const component = popup.getComponent(PopupComponent);
		component.update({ ...component.read(), closed: true });
	}
}

export class ConfirmPopupCommand extends DismissPopupCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class CancelPopupCommand extends DismissPopupCommand {
	constructor() {
		super(cancelBinding());
	}
}

/** The popup commands as one list, so the state allowing them and the feature registering them stay in step. */
export const popupCommands: GameCommandConstructor[] = [ConfirmPopupCommand, CancelPopupCommand];
