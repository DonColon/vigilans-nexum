import { Query, QueryList } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";
import { World } from "@/core/ecs/World";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";
import { MapTheme } from "@/game/map/model/MapTheme";
import { GridSystem } from "@/game/map/systems/GridSystem";

/**
 * Draws the battle map: one flat block per tile, a hairline grid on top and a
 * frame around the whole thing - the look of the minimaps the Fire Emblem
 * games show their battle maps on.
 */
export class GridRenderSystem extends RenderSystem {
	protected queries!: QueryList;

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	public initialize(): void {
		this.queries = {
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(): void {
		const graphics = this.display.getLayer("background");
		graphics.clearCanvas();

		const map = this.queries.grids.getSingleResult();

		if (map === null) {
			return;
		}

		const transforms = this.world.getSystem(TransformSystem) as TransformSystem;
		const origin = transforms.getWorldPosition(map);

		if (origin === null) {
			return;
		}

		const grid = map.getComponent(GridComponent).read();

		this.renderTiles(graphics, grid, origin);
		this.renderGridLines(graphics, grid, origin);
		this.renderBorder(graphics, grid, origin);
	}

	private renderTiles(graphics: Graphics, grid: GridData, origin: Vector2D) {
		const { columns, rows, cellSize } = grid;

		for (let row = 0; row < rows; row++) {
			for (let column = 0; column < columns; column++) {
				const terrain = GridSystem.getTerrain(grid, column, row);

				if (terrain === null) {
					continue;
				}

				const tile = new Rectangle(origin.x + column * cellSize, origin.y + row * cellSize, cellSize, cellSize);

				graphics.fillColor(MapTheme.terrain[terrain]).fillRectangle(tile);
			}
		}
	}

	private renderGridLines(graphics: Graphics, grid: GridData, origin: Vector2D) {
		const { columns, rows, cellSize } = grid;
		const { width, height } = GridSystem.getGridDimension(grid);

		graphics.strokeColor(MapTheme.gridLine).lineStyle({ width: MapTheme.gridLineWidth });

		for (let column = 1; column < columns; column++) {
			const x = origin.x + column * cellSize;
			graphics.drawLine(new Line(x, origin.y, x, origin.y + height));
		}

		for (let row = 1; row < rows; row++) {
			const y = origin.y + row * cellSize;
			graphics.drawLine(new Line(origin.x, y, origin.x + width, y));
		}
	}

	private renderBorder(graphics: Graphics, grid: GridData, origin: Vector2D) {
		const { width, height } = GridSystem.getGridDimension(grid);
		const offset = MapTheme.borderWidth / 2;

		const border = new Rectangle(origin.x - offset, origin.y - offset, width + MapTheme.borderWidth, height + MapTheme.borderWidth);

		graphics.strokeColor(MapTheme.border).lineStyle({ width: MapTheme.borderWidth }).strokeRectangle(border);
	}
}
