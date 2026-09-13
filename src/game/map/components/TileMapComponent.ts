import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { EMPTY_TILE } from "@/game/map/content/TileMapFormat";

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

	/**
	 * What the map draws on a tile: the topmost layer with anything in that
	 * cell, and the frame found there - what a door or a chest looks like as the
	 * map authored it. Null when the tile is off the map or every layer leaves
	 * it empty.
	 */
	public static topFrameAt(tilemap: TileMapData, column: number, row: number): { layer: number; cell: number; frame: number } | null {
		if (column < 0 || column >= tilemap.columns || row < 0 || row >= tilemap.rows) {
			return null;
		}

		const cell = row * tilemap.columns + column;

		for (let layer = tilemap.layers.length - 1; layer >= 0; layer--) {
			const frame = tilemap.layers[layer].tiles[cell];

			if (frame > EMPTY_TILE) {
				return { layer, cell, frame };
			}
		}

		return null;
	}

	/**
	 * The tile map with `frame` put in one cell of one layer. A fresh object
	 * rather than an edit in place - the component owns its data and takes the
	 * new one through `update`, and only the one layer that changed is rebuilt.
	 * The very same object comes back when the cell already shows that frame.
	 */
	public static withFrame(tilemap: TileMapData, at: { layer: number; cell: number }, frame: number): TileMapData {
		if (tilemap.layers[at.layer]?.tiles[at.cell] === frame) {
			return tilemap;
		}

		const layers = tilemap.layers.map((layer, index) => {
			if (index !== at.layer) {
				return layer;
			}

			const tiles = [...layer.tiles];
			tiles[at.cell] = frame;

			return { ...layer, tiles };
		});

		return { ...tilemap, layers };
	}
}
