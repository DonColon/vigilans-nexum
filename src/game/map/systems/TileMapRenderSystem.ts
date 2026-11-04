import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query, QueryList } from "@/core/ecs/Query";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";
import { TileMapComponent, TileMapData } from "@/game/map/components/TileMapComponent";
import { EMPTY_TILE } from "@/game/map/content/TileMapFormat";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { MapTheme } from "@/game/map/view/MapTheme";

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

	public initialize(): this {
		this.queries = {
			tilemaps: new Query({ allowlist: [TileMapComponent, GridComponent, TransformComponent] })
		};

		return this;
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

		// The ground colour covers the whole screen, not just the map: a map
		// smaller than the viewport is centred in it, and the band around it
		// should read as more of the same ground rather than the page behind.
		if (tilemap.background) {
			const viewport = this.display.getViewportDimension();
			graphics.fillColor(Color.hex(tilemap.background)).fillRectangle(new Rectangle(0, 0, viewport.width, viewport.height));
		}

		this.renderLayers(graphics, tilemap, view.origin, view.cellSize);
		this.renderOutOfPlay(graphics, view.grid, view.origin);
	}

	/** Dims the backdrop of a battle fought on part of the map. */
	private renderOutOfPlay(graphics: Graphics, grid: GridData, origin: Vector2D) {
		if (grid.area.length === 0) {
			return;
		}

		const { columns, rows, cellSize } = grid;

		graphics.fillColor(MapTheme.outOfPlay);

		for (let row = 0; row < rows; row++) {
			for (let column = 0; column < columns; column++) {
				if (!GridComponent.inPlay(grid, column, row)) {
					graphics.fillRectangle(new Rectangle(origin.x + column * cellSize, origin.y + row * cellSize, cellSize, cellSize));
				}
			}
		}
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
