import { Entity } from "@/core/ecs/Entity";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";

/**
 * Moving the map cursor from code rather than from the player's input - what a
 * flow does when it points at a unit on the player's behalf (the battle
 * forecast at its target, a trade or a talk at its partner).
 */

/** Puts the cursor on a tile, leaving it alone when it is already there. */
export function moveCursorTo(cursor: Entity | null, tile: GridPositionData): void {
	if (cursor === null) {
		return;
	}

	const component = cursor.getComponent(GridPositionComponent);
	const current = component.read();

	if (current.column !== tile.column || current.row !== tile.row) {
		component.update({ ...current, column: tile.column, row: tile.row });
	}
}
