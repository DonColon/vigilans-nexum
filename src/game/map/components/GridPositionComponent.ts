import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface GridPositionData extends JsonSchema {
	column: number;
	row: number;
}

/**
 * Tile coordinates of an entity on the active grid. Shared by anything that
 * occupies a tile - the cursor today, units on the map later - so the shape
 * only has to be defined once.
 */
export class GridPositionComponent extends Component<GridPositionData> {
	public static readonly type = "gridPosition";

	constructor(data: Partial<GridPositionData> = {}) {
		super({
			column: data.column ?? 0,
			row: data.row ?? 0
		});
	}
}
