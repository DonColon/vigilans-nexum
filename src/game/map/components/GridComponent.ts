import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { TerrainType } from "@/game/map/model/Terrain";

export interface GridData extends JsonSchema {
	columns: number;
	rows: number;
	/** Edge length of a single tile in pixels. */
	cellSize: number;
	/** Terrain of every tile in row major order, `columns * rows` entries. */
	tiles: TerrainType[];
}

/**
 * The battle map itself: how many tiles it spans and what terrain each of them
 * carries. Where the map sits on screen is not part of it - that is the job of
 * the TransformComponent on the same entity, which every tile position is
 * resolved against.
 */
export class GridComponent extends Component<GridData> {
	public static readonly type = "grid";
}
