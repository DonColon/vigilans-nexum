import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query, QueryList } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";
import { World } from "@/core/ecs/World";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent } from "@/game/map/components/GridComponent";
import { TileMapComponent, TileMapData } from "@/game/map/components/TileMapComponent";
import { EMPTY_TILE } from "@/game/map/model/TileMapFormat";

/**
 * Draws the tileset art of the battle map: every visual layer blitted cell by
 * cell, bottom layer first, on top of the flat terrain colours GridRenderSystem
 * already laid on the background layer (which is why this system does not clear
 * it). Runs after GridRenderSystem and before the cursor. Does nothing until the
 * tileset spritesheet has finished loading, a frame or two after the map state
 * is entered.
 */
export class TileMapRenderSystem extends RenderSystem {
	protected queries!: QueryList;

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			tilemaps: new Query({ allowlist: [TileMapComponent, GridComponent, TransformComponent] })
		};
	}

	public execute(): void {
		const entity = this.queries.tilemaps.getSingleResult();

		if (entity === null) {
			return;
		}

		const tilemap = entity.getComponent(TileMapComponent).read();

		if (!this.assetStorage.hasSpritesheet(tilemap.tileset)) {
			return;
		}

		const transforms = this.world.getSystem(TransformSystem) as TransformSystem;
		const origin = transforms.getWorldPosition(entity);

		if (origin === null) {
			return;
		}

		const graphics = this.display.getLayer("background");

		// The 1-bit art is drawn scaled up, so smoothing has to be off or every
		// tile edge turns into a grey smear.
		graphics.imageSmoothing();

		const cellSize = entity.getComponent(GridComponent).read().cellSize;

		if (tilemap.background) {
			const size = new Rectangle(origin.x, origin.y, tilemap.columns * cellSize, tilemap.rows * cellSize);
			graphics.fillColor(Color.hex(tilemap.background)).fillRectangle(size);
		}

		this.renderLayers(graphics, tilemap, origin, cellSize);
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
