import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { confirmBinding } from "@/game/input/Controls";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { Terrain } from "@/game/map/model/Terrain";

/**
 * Confirm on the tile under the cursor. The map itself does nothing with it - it
 * announces `map:tileConfirmed` and lets whoever is listening decide. The UI
 * feature picks it up and opens the tile menu; with the UI feature left out the
 * event simply has no subscribers.
 */
export class ConfirmCommand extends MapCommand {
	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { map, cursor }: MapCommandContext): void {
		const grid = map.getComponent(GridComponent).read();
		const { column, row } = cursor.getComponent(GridPositionComponent).read();

		this.eventSystem.dispatch("map:tileConfirmed", {
			column,
			row,
			terrain: GridSystem.getTerrain(grid, column, row) ?? Terrain.PLAIN
		});
	}
}

/** Exported as a list to match the shape of `moveCursorCommands`. */
export const confirmCommands: GameCommandConstructor[] = [ConfirmCommand];
