import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { infoBinding } from "@/game/input/Controls";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";

/**
 * The map's info button - Fire Emblem's R over a unit. Like ConfirmCommand and
 * ThreatCommand it decides nothing itself: it announces `map:infoRequested`
 * with the tile under the cursor and lets whoever is listening decide. The
 * status feature opens the unit sheet when a unit is standing there; with
 * nothing listening, or nothing on the tile, the press is a no-op.
 */
export class InfoCommand extends MapCommand {
	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	constructor() {
		super(infoBinding());
	}

	protected action(_elapsed: number, _frame: number, { cursor }: MapCommandContext): void {
		const { column, row } = cursor.getComponent(GridPositionComponent).read();

		this.eventSystem.dispatch("map:infoRequested", { column, row });
	}
}

/** Exported as a list to match the shape of `confirmCommands`. */
export const infoCommands: GameCommandConstructor[] = [InfoCommand];
