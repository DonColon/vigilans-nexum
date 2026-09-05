import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface TileMapLayerData extends JsonSchema {
	name: string;
	/** `columns * rows` frame indices in row major order, -1 for an empty cell. */
	tiles: number[];
	/** `columns * rows` orientation bit masks (see `TileFlip`), 0 for upright. */
	flips: number[];
}

export interface TileMapData extends JsonSchema {
	/** Asset id of the spritesheet the frame indices point into. */
	tileset: string;
	/** Source tile size in the tileset, in pixels. */
	tileWidth: number;
	tileHeight: number;
	columns: number;
	rows: number;
	/** Hex colour painted under the layers, or `""` for none. */
	background: string;
	/** Visual layers, bottom first, drawn in order. */
	layers: TileMapLayerData[];
}

/**
 * The look of the battle map: which tileset it draws from and which frame sits
 * in every cell of every layer. The gameplay side of the map - what each tile
 * *is* - lives on the GridComponent of the same entity. Where the map sits on
 * screen is the TransformComponent's job, exactly as with the grid.
 */
export class TileMapComponent extends Component<TileMapData> {
	public static readonly type = "tilemap";
}
