import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";

export interface MovementData extends JsonSchema {
	/** Id of the unit that is picked up, or `""` when none is. */
	unitId: string;
	/** Tile the unit was picked up from - where it returns to if the move is cancelled. */
	originColumn: number;
	originRow: number;
	/** Tiles it can move onto (the Fire Emblem blue overlay). */
	movement: GridPositionData[];
	/** Tiles it could attack from somewhere it can reach (the red overlay). */
	attack: GridPositionData[];
	/** Shortest route from the origin to the tile under the cursor, kept live by PathPreviewSystem. */
	path: GridPositionData[];
}

/**
 * The map's single "a unit is being moved right now" record: which unit, the
 * range worked out when it was picked up and the route the cursor is currently
 * tracing through that range. One instance, created with the units and read by
 * the movement renderer.
 */
export class MovementComponent extends Component<MovementData> {
	public static readonly type = "movement";
}

/** A fresh "nothing selected" record - fresh arrays each call, never a shared one. */
export function idleMovement(): MovementData {
	return { unitId: "", originColumn: 0, originRow: 0, movement: [], attack: [], path: [] };
}
