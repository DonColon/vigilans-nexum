import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";
import { World } from "@/core/ecs/World";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Circle } from "@/core/math/geometry/Circle";
import { Line } from "@/core/math/geometry/Line";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitData, WeaponType } from "@/game/units/model/UnitData";
import { UnitTheme } from "@/game/units/model/UnitTheme";

/**
 * Draws the unit tokens - one disc per unit, faction-coloured, with a schematic
 * sword or axe on it. On the "background" layer above the tileset art and the
 * move overlay, so it never clears anything (GridRenderSystem wipes the layer
 * every frame). The cursor is drawn over the top from its own layer.
 */
export class UnitRenderSystem extends RenderSystem {
	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	public initialize(): void {
		this.queries = {
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			grids: new Query({ allowlist: [GridComponent, TransformComponent] })
		};
	}

	public execute(): void {
		const map = this.queries.grids.getSingleResult();

		if (map === null) {
			return;
		}

		const transforms = this.world.getSystem(TransformSystem) as TransformSystem;
		const origin = transforms.getWorldPosition(map);

		if (origin === null) {
			return;
		}

		const graphics = this.display.getLayer("background");
		const { cellSize } = map.getComponent(GridComponent).read();

		for (const entity of this.queries.units.getResult()) {
			const unit = entity.getComponent(UnitComponent).read();
			const position = entity.getComponent(GridPositionComponent).read();

			this.renderUnit(graphics, unit, origin.x + position.column * cellSize, origin.y + position.row * cellSize, cellSize);
		}
	}

	private renderUnit(graphics: Graphics, unit: UnitData, x: number, y: number, cellSize: number): void {
		const colors = UnitTheme.faction[unit.faction];
		const centre = new Vector2D(x + cellSize / 2, y + cellSize / 2);
		const radius = (cellSize * UnitTheme.tokenSize) / 2;

		if (unit.hasMoved) {
			graphics.alpha(UnitTheme.movedAlpha);
		}

		graphics.fillColor(UnitTheme.shadow).fillCircle(new Circle(centre.x, centre.y + radius * 0.28, radius));

		graphics.fillColor(colors.body).fillCircle(new Circle(centre.x, centre.y, radius));

		graphics
			.strokeColor(UnitTheme.tokenOutline)
			.lineStyle({ width: UnitTheme.ringWidth + 2 })
			.strokeCircle(new Circle(centre.x, centre.y, radius));
		graphics
			.strokeColor(colors.ring)
			.lineStyle({ width: UnitTheme.ringWidth })
			.strokeCircle(new Circle(centre.x, centre.y, radius));

		this.renderGlyph(graphics, unit.weapon.type, centre, radius, colors.glyph);

		graphics.alpha(1);
	}

	/** A schematic sword or axe, drawn from a couple of strokes so no font is needed. */
	private renderGlyph(graphics: Graphics, weapon: WeaponType, centre: Vector2D, radius: number, color: Color): void {
		graphics.strokeColor(UnitTheme.tokenOutline).lineStyle({ width: UnitTheme.glyphWidth + 2 });
		this.glyphStrokes(graphics, weapon, centre, radius);

		graphics.strokeColor(color).lineStyle({ width: UnitTheme.glyphWidth });
		this.glyphStrokes(graphics, weapon, centre, radius);
	}

	private glyphStrokes(graphics: Graphics, weapon: WeaponType, centre: Vector2D, radius: number): void {
		const { x, y } = centre;

		if (weapon === WeaponType.AXE) {
			// A near-upright haft with a bit-shaped wedge hanging off its top right,
			// so it reads as an axe rather than a slash across the disc.
			const haft = x - radius * 0.18;
			graphics.drawLine(new Line(haft, y - radius * 0.5, haft, y + radius * 0.55));
			graphics.drawLine(new Line(haft, y - radius * 0.44, x + radius * 0.5, y - radius * 0.24));
			graphics.drawLine(new Line(x + radius * 0.5, y - radius * 0.24, x + radius * 0.32, y + radius * 0.14));
			graphics.drawLine(new Line(x + radius * 0.32, y + radius * 0.14, haft, y - radius * 0.02));
			return;
		}

		// Sword: blade down the middle, a short crossguard near the hilt.
		graphics.drawLine(new Line(x, y - radius * 0.55, x, y + radius * 0.5));
		graphics.drawLine(new Line(x - radius * 0.32, y + radius * 0.22, x + radius * 0.32, y + radius * 0.22));
	}
}
