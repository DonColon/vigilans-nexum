import { Query, QueryList } from "@/core/ecs/Query";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";
import { MapTheme } from "@/game/map/model/MapTheme";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { OptionId } from "@/game/options/model/GameOptions";
import { optionEnabled } from "@/game/options/GameSettings";

/**
 * Draws the battle map: one flat block per tile, a hairline grid on top and a
 * frame around the whole thing - the look of the minimaps the Fire Emblem
 * games show their battle maps on.
 */
export class GridRenderSystem extends MapRenderSystem {
	protected queries!: QueryList;

	public initialize(): void {
		this.queries = {
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(): void {
		const graphics = this.display.getLayer("background");
		graphics.clearCanvas();

		const view = this.mapView(this.queries.grids.getSingleResult());

		if (view === null) {
			return;
		}

		this.renderTiles(graphics, view.grid, view.origin);
		// The tile lattice is a readability aid some players would rather not see -
		// the terrain colours and the tileset art read on their own without it.
		if (optionEnabled(OptionId.GRID_LINES)) {
			this.renderGridLines(graphics, view.grid, view.origin);
		}
		this.renderBorder(graphics, view.grid, view.origin);
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
