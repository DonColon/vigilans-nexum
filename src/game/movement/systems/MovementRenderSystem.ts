import { Query } from "@/core/ecs/Query";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GridComponent } from "@/game/map/components/GridComponent";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { MovementComponent } from "@/game/movement/components/MovementComponent";
import { MovementTheme } from "@/game/movement/model/MovementTheme";
import { Direction, OPPOSITE, pathTiles } from "@/game/movement/model/PathTiles";

/**
 * Draws the move overlay under the units: the blue movement wash, the red
 * attack wash and the connected path the cursor traces. On the "background"
 * layer below UnitRenderSystem, so it never clears - GridRenderSystem wipes the
 * layer every frame.
 *
 * The path is drawn from filled rectangles and one triangle rather than
 * tilesheet frames: the kenney path pieces are a 6px bar on a 16px grid, and
 * every rotation of that lands half a pixel off, so a turned corner never meets
 * the straight beside it. A centred band has no such seam.
 */
export class MovementRenderSystem extends MapRenderSystem {
	public initialize(): void {
		this.queries = {
			movements: new Query({ allowlist: [MovementComponent] }),
			grids: new Query({ allowlist: [GridComponent, TransformComponent] })
		};
	}

	public execute(): void {
		const movementEntity = this.queries.movements.getSingleResult();
		const map = this.queries.grids.getSingleResult();

		if (movementEntity === null || map === null) {
			return;
		}

		const movement = movementEntity.getComponent(MovementComponent).read();

		if (movement.unitId.length === 0) {
			return;
		}

		const view = this.mapView(map);

		if (view === null) {
			return;
		}

		const graphics = this.display.getLayer("background");
		const { origin, cellSize } = view;

		this.renderRange(graphics, movement.attack, origin, cellSize, MovementTheme.attackFill, MovementTheme.attackEdge);
		this.renderRange(graphics, movement.movement, origin, cellSize, MovementTheme.moveFill, MovementTheme.moveEdge);
		this.renderPath(graphics, movement.path, origin, cellSize);
	}

	private renderRange(graphics: Graphics, tiles: readonly GridPositionData[], origin: Vector2D, cellSize: number, fill: Color, edge: Color): void {
		graphics.fillColor(fill);

		for (const tile of tiles) {
			graphics.fillRectangle(new Rectangle(origin.x + tile.column * cellSize, origin.y + tile.row * cellSize, cellSize, cellSize));
		}

		graphics.strokeColor(edge).lineStyle({ width: 1 });

		for (const tile of tiles) {
			graphics.strokeRectangle(new Rectangle(origin.x + tile.column * cellSize + 1, origin.y + tile.row * cellSize + 1, cellSize - 2, cellSize - 2));
		}
	}

	private renderPath(graphics: Graphics, route: readonly GridPositionData[], origin: Vector2D, cellSize: number): void {
		if (route.length < 2) {
			return;
		}

		const tiles = pathTiles(route);
		const band = Math.max(4, Math.round(cellSize * MovementTheme.pathBand)) & ~1;

		graphics.fillColor(MovementTheme.pathBacking);
		for (const tile of tiles) {
			graphics.fillRectangle(new Rectangle(origin.x + tile.column * cellSize, origin.y + tile.row * cellSize, cellSize, cellSize));
		}

		graphics.fillColor(MovementTheme.path);
		for (const tile of tiles) {
			const x = origin.x + tile.column * cellSize;
			const y = origin.y + tile.row * cellSize;

			for (const edge of tile.edges) {
				graphics.fillRectangle(this.arm(x, y, cellSize, band, edge));
			}

			if (tile.kind === "head") {
				this.head(graphics, x, y, cellSize, band, OPPOSITE[tile.edges[0]]);
			} else if (tile.kind === "start") {
				this.fray(graphics, x, y, cellSize, band, OPPOSITE[tile.edges[0]]);
			}
		}
	}

	/** A band from the tile's `edge` side through its centre, `band` wide and centred on the cross axis. */
	private arm(x: number, y: number, cellSize: number, band: number, edge: Direction): Rectangle {
		const near = (cellSize - band) / 2;
		const past = cellSize / 2 + band / 2;

		switch (edge) {
			case "up":
				return new Rectangle(x + near, y, band, past);
			case "down":
				return new Rectangle(x + near, y + cellSize - past, band, past);
			case "left":
				return new Rectangle(x, y + near, past, band);
			default:
				return new Rectangle(x + cellSize - past, y + near, past, band);
		}
	}

	/** A solid arrow head pointing `facing`, its base overlapping the band at the centre. */
	private head(graphics: Graphics, x: number, y: number, cellSize: number, band: number, facing: Direction): void {
		const cx = x + cellSize / 2;
		const cy = y + cellSize / 2;
		const reach = cellSize / 2;
		const back = band / 2;
		const wing = band / 2 + 4;

		const point = (along: number, across: number) => {
			switch (facing) {
				case "up":
					return [cx + across, cy - along];
				case "down":
					return [cx - across, cy + along];
				case "left":
					return [cx - along, cy - across];
				default:
					return [cx + along, cy + across];
			}
		};

		const [tx, ty] = point(reach, 0);
		const [ax, ay] = point(-back, -wing);
		const [bx, by] = point(-back, wing);

		graphics.beginPath();
		graphics.moveTo(tx, ty);
		graphics.lineTo(ax, ay);
		graphics.lineTo(bx, by);
		graphics.closePath();
		graphics.fill();
	}

	/** Two small dashes trailing the start stub, echoing the kenney start tile's frayed tail. */
	private fray(graphics: Graphics, x: number, y: number, cellSize: number, band: number, trailing: Direction): void {
		const cx = x + cellSize / 2;
		const cy = y + cellSize / 2;
		const step = band / 2 + 1;
		const dot = Math.max(2, Math.round(band / 3));

		const delta: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
		const [dx, dy] = delta[trailing];

		for (let index = 1; index <= 2; index++) {
			const px = cx + dx * step * index - dot / 2;
			const py = cy + dy * step * index - dot / 2;
			graphics.fillRectangle(new Rectangle(px, py, dot, dot));
		}
	}
}
