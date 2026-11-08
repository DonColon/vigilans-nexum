import { i18n } from "@/core/i18n/I18n";
import { GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { InputSet } from "@/core/input/commands/InputBindings";
import { VirtualPadLayout } from "@/core/input/virtualpad/VirtualPadOverlay";
import { CANCEL, CONFIRM, DOWN, INFO, LEFT, RIGHT, THREAT, UP } from "@/game/input/Controls";

/** The first gamepad button of a set - the one the on-screen pad presses for it. */
function buttonOf(set: InputSet): GamepadInputType {
	const button = set.buttons?.[0];

	if (button === undefined) {
		throw new Error("Every control needs a gamepad button for the touch pad to press");
	}

	return button;
}

/**
 * The touch pad on a phone: the cross moves, and four buttons stand for the
 * game's named controls - confirm, cancel, the unit sheet and the enemy's
 * reach. Each presses the first gamepad button of its set in Controls.ts, so
 * the pad can never drift from what the commands listen to.
 */
export function touchControls(): VirtualPadLayout {
	return {
		directions: { up: buttonOf(UP), down: buttonOf(DOWN), left: buttonOf(LEFT), right: buttonOf(RIGHT) },
		buttons: [
			{ button: buttonOf(CONFIRM), name: "confirm", label: "A", description: i18n("touch.confirm") },
			{ button: buttonOf(CANCEL), name: "cancel", label: "B", description: i18n("touch.cancel") },
			{ button: buttonOf(INFO), name: "info", label: i18n("touch.infoLabel"), description: i18n("touch.info") },
			{ button: buttonOf(THREAT), name: "threat", label: i18n("touch.threatLabel"), description: i18n("touch.threat") }
		]
	};
}
