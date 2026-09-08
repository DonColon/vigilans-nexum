import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { cancelBinding } from "@/game/input/Controls";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";

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
