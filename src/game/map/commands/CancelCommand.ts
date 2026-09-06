import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState } from "@/core/input/InputState";
import { EventSystem } from "@/core/events/EventSystem";
import { GamepadInput } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";

function cancelBinding(): InputBinding {
	const keys = [KeyboardInput.ESCAPE, KeyboardInput.KEY_X, KeyboardInput.BACKSPACE];
	const buttons = [GamepadInput.B];

	return new InputBinding({
		and: false,
		bindings: [
			...keys.map((input) => new InputBinding({ channel: InputChannel.KEYBOARD, input, state: InputState.JUST_PRESSED })),
			...buttons.map((input) => new InputBinding({ channel: InputChannel.GAMEPAD, input, state: InputState.JUST_PRESSED }))
		]
	});
}

/**
 * The map's back button - Fire Emblem's B. Like ConfirmCommand it does nothing
 * itself, it announces `map:cancelled` and lets whoever is listening decide.
 * The units feature uses it to put a picked-up unit back down; with nothing
 * listening the press is a no-op.
 */
export class CancelCommand extends MapCommand {
	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, _context: MapCommandContext): void {
		this.eventSystem.dispatch("map:cancelled", {});
	}
}

/** Exported as a list to match the shape of `confirmCommands`. */
export const cancelCommands: GameCommandConstructor[] = [CancelCommand];
