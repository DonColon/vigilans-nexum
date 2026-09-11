import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { threatBinding } from "@/game/input/Controls";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";

/**
 * The map's enemy-range button - Radiant Dawn's "Enemy Range". Like
 * ConfirmCommand and CancelCommand it decides nothing itself: it announces
 * `map:threatToggled` and lets whoever is listening decide. The threat feature
 * uses it to raise and drop the army-wide overlay; with nothing listening the
 * press is a no-op.
 */
export class ThreatCommand extends MapCommand {
	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	constructor() {
		super(threatBinding());
	}

	protected action(_elapsed: number, _frame: number, _context: MapCommandContext): void {
		this.eventSystem.dispatch("map:threatToggled", {});
	}
}

/** Exported as a list to match the shape of `confirmCommands`. */
export const threatCommands: GameCommandConstructor[] = [ThreatCommand];
