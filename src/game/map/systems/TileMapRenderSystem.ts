import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query, QueryList } from "@/core/ecs/Query";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent } from "@/game/map/components/GridComponent";
import { TileMapComponent, TileMapData } from "@/game/map/components/TileMapComponent";
import { EMPTY_TILE } from "@/game/map/model/TileMapFormat";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";

/**
 * Draws the tileset art of the battle map: every visual layer blitted cell by
 * cell, bottom layer first, on top of the flat terrain colours GridRenderSystem
 * already laid on the background layer (which is why this system does not clear
 * it). Runs after GridRenderSystem and before the cursor. Does nothing until the
 * tileset spritesheet has finished loading, a frame or two after the map state
 * is entered.
 */
export class TileMapRenderSystem extends MapRenderSystem {
	protected queries!: QueryList;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			tilemaps: new Query({ allowlist: [TileMapComponent, GridComponent, TransformComponent] })
		};
	}

	public execute(): void {
		const view = this.mapView(this.queries.tilemaps.getSingleResult());

		if (view === null) {
			return;
		}

		const tilemap = view.map.getComponent(TileMapComponent).read();

		if (!this.assetStorage.hasSpritesheet(tilemap.tileset)) {
			return;
		}

		const graphics = this.display.getLayer("background");

		// The 1-bit art is drawn scaled up, so smoothing has to be off or every
		// tile edge turns into a grey smear.
		graphics.imageSmoothing();

		if (tilemap.background) {
			const size = new Rectangle(view.origin.x, view.origin.y, tilemap.columns * view.cellSize, tilemap.rows * view.cellSize);
			graphics.fillColor(Color.hex(tilemap.background)).fillRectangle(size);
		}

		this.renderLayers(graphics, tilemap, view.origin, view.cellSize);
	}

	private renderLayers(graphics: Graphics, tilemap: TileMapData, origin: Vector2D, cellSize: number) {
		const { columns, rows, tileWidth, tileset } = tilemap;
		const scale = cellSize / tileWidth;

		for (const layer of tilemap.layers) {
			for (let row = 0; row < rows; row++) {
				for (let column = 0; column < columns; column++) {
					const cell = row * columns + column;
					const frame = layer.tiles[cell];

					if (frame <= EMPTY_TILE) {
						continue;
					}

					graphics.drawTile(tileset, frame, origin.x + column * cellSize, origin.y + row * cellSize, scale, layer.flips[cell] ?? 0);
				}
			}
		}
	}
}
