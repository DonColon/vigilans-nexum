import { Query, QueryList } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";
import { World } from "@/core/ecs/World";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { MapTheme } from "@/game/map/model/MapTheme";

/** Pixels the cursor breathes in and out of the tile it sits on. */
const PULSE_AMPLITUDE = 1.5;

/** Milliseconds of a full breathing cycle. */
const PULSE_PERIOD = 1400;

/**
 * Draws the tile cursor as the four corner brackets Fire Emblem frames the
 * selected tile with. Reads the position off the transform, so the cursor
 * follows the map wherever the map is placed.
 */
export class CursorRenderSystem extends RenderSystem {
	protected queries!: QueryList;

	private time!: number;

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	public initialize(): void {
		this.queries = {
			cursors: new Query({ allowlist: [CursorComponent, TransformComponent] }),
			grids: new Query({ allowlist: [GridComponent] })
		};

		this.time = 0;
	}

	public execute(elapsed: number): void {
		const graphics = this.display.getLayer("gameplay");
		graphics.clearCanvas();

		const map = this.queries.grids.getSingleResult();

		if (map === null) {
			return;
		}

		this.time += elapsed;

		const { cellSize } = map.getComponent(GridComponent).read();
		const transforms = this.world.getSystem(TransformSystem) as TransformSystem;

		const pulse = PULSE_AMPLITUDE * (1 + Math.sin((this.time / PULSE_PERIOD) * 2 * Math.PI));

		for (const entity of this.queries.cursors.getResult()) {
			const position = transforms.getWorldPosition(entity);

			if (position === null) {
				continue;
			}

			const tile = new Rectangle(position.x - pulse, position.y - pulse, cellSize + 2 * pulse, cellSize + 2 * pulse);

			this.renderBrackets(graphics, tile);
		}
	}

	private renderBrackets(graphics: Graphics, tile: Rectangle) {
		const brackets = this.getBrackets(tile);

		// Drawn twice: a dark, slightly wider pass underneath keeps the cursor
		// readable on bright terrain like plains and forts.
		graphics.strokeColor(MapTheme.cursorOutline).lineStyle({ width: MapTheme.cursorWidth + 2 });

		for (const bracket of brackets) {
			graphics.drawLine(bracket);
		}

		graphics.strokeColor(MapTheme.cursor).lineStyle({ width: MapTheme.cursorWidth });

		for (const bracket of brackets) {
			graphics.drawLine(bracket);
		}
	}

	private getBrackets(tile: Rectangle): Line[] {
		const { topLeft, topRight, bottomLeft, bottomRight } = tile.getCorners();
		const length = Math.min(tile.getWidth(), tile.getHeight()) * MapTheme.cursorBracket;

		return [
			new Line(topLeft.x, topLeft.y, topLeft.x + length, topLeft.y),
			new Line(topLeft.x, topLeft.y, topLeft.x, topLeft.y + length),
			new Line(topRight.x, topRight.y, topRight.x - length, topRight.y),
			new Line(topRight.x, topRight.y, topRight.x, topRight.y + length),
			new Line(bottomLeft.x, bottomLeft.y, bottomLeft.x + length, bottomLeft.y),
			new Line(bottomLeft.x, bottomLeft.y, bottomLeft.x, bottomLeft.y - length),
			new Line(bottomRight.x, bottomRight.y, bottomRight.x - length, bottomRight.y),
			new Line(bottomRight.x, bottomRight.y, bottomRight.x, bottomRight.y - length)
		];
	}
}
