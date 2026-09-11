import { Query } from "@/core/ecs/Query";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { ThreatComponent } from "@/game/threat/components/ThreatComponent";
import { ThreatTheme } from "@/game/threat/model/ThreatTheme";

/**
 * Draws the enemy-range overlay: the crimson wash over the tiles the other side
 * can walk onto and the amber one over what that puts in reach. On the
 * "background" layer between the terrain art (14) and the player's own move
 * overlay (16), so a picked-up unit's blue range reads on top of it and the
 * unit tokens (17) sit above both. It never clears - GridRenderSystem wipes the
 * layer every frame.
 */
export class ThreatRenderSystem extends MapRenderSystem {
	public initialize(): void {
		this.queries = {
			threats: new Query({ allowlist: [ThreatComponent] }),
			grids: new Query({ allowlist: [GridComponent, TransformComponent] })
		};
	}

	public execute(): void {
		const threatEntity = this.queries.threats.getSingleResult();
		const map = this.queries.grids.getSingleResult();

		if (threatEntity === null || map === null) {
			return;
		}

		const threat = threatEntity.getComponent(ThreatComponent).read();

		if (threat.unitIds.length === 0) {
			return;
		}

		const view = this.mapView(map);

		if (view === null) {
			return;
		}

		const graphics = this.display.getLayer("background");
		const { origin, cellSize } = view;

		this.renderRange(graphics, threat.attack, origin, cellSize, ThreatTheme.attackFill, ThreatTheme.attackEdge);
		this.renderRange(graphics, threat.movement, origin, cellSize, ThreatTheme.moveFill, ThreatTheme.moveEdge);
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
}
