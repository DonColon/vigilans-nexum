import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Circle } from "@/core/math/geometry/Circle";
import { clamp01 } from "@/core/math/utils/Clamp";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { walkPoint } from "@/game/movement/model/PathWalk";
import { CombatAnimationComponent, CombatAnimationData } from "@/game/combat/components/CombatAnimationComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { drawText } from "@/game/ui/model/UIPanel";
import { UITheme } from "@/game/ui/model/UITheme";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitData, WeaponType } from "@/game/units/model/UnitData";
import { PopKind } from "@/game/units/model/UnitPop";
import { UnitPopComponent } from "@/game/units/components/UnitPopComponent";
import { UnitTheme } from "@/game/units/model/UnitTheme";

/** No fight animation running on this token - the neutral values. */
const RESTING: CombatAnimationData = { offsetColumn: 0, offsetRow: 0, flash: 0, critFlash: 0, hp: 0, alpha: 1, popText: "", popKind: PopKind.DAMAGE, popAge: 0 };

/** Dark-outline offsets for the floating combat text, so it reads on any terrain. */
const POP_OUTLINE: readonly [number, number][] = [
	[-1, 0],
	[1, 0],
	[0, -1],
	[0, 1]
];

/** A label to draw over a token this frame, wherever it came from. */
interface FloatingPop {
	text: string;
	kind: PopKind;
	/** 0-1 through its lifetime - the renderer rises and fades it by this. */
	age: number;
	/** Top-left screen pixel of the tile it belongs to. */
	x: number;
	y: number;
}

/**
 * Draws the unit tokens - one disc per unit, faction-coloured, with a schematic
 * sword or axe on it and a faction-coloured HP bar across the foot of its tile.
 * On the "background" layer above the tileset art and the move overlay, so it
 * never clears anything (GridRenderSystem wipes the layer every frame). The
 * cursor is drawn over the top from its own layer.
 */
export class UnitRenderSystem extends MapRenderSystem {
	public initialize(): void {
		this.queries = {
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			grids: new Query({ allowlist: [GridComponent, TransformComponent] })
		};
	}

	public execute(): void {
		const view = this.mapView(this.queries.grids.getSingleResult());

		if (view === null) {
			return;
		}

		const graphics = this.display.getLayer("background");
		const { origin, cellSize } = view;

		// Floating labels are drawn in a second pass so no token can overdraw them.
		const pops: FloatingPop[] = [];

		for (const entity of this.queries.units.getResult()) {
			const unit = entity.getComponent(UnitComponent).read();
			const anim = entity.hasComponent(CombatAnimationComponent) ? entity.getComponent(CombatAnimationComponent).read() : RESTING;
			const tile = this.tileOf(entity);

			const x = origin.x + (tile.column + anim.offsetColumn) * cellSize;
			const y = origin.y + (tile.row + anim.offsetRow) * cellSize;

			this.renderUnit(graphics, unit, anim, x, y, cellSize);

			if (anim.popText !== "") {
				pops.push({ text: anim.popText, kind: anim.popKind, age: anim.popAge, x, y });
			}

			// The standalone label a heal (or anything outside a fight) leaves.
			if (entity.hasComponent(UnitPopComponent)) {
				const pop = entity.getComponent(UnitPopComponent).read();
				pops.push({ text: pop.text, kind: pop.kind, age: pop.duration > 0 ? pop.elapsed / pop.duration : 1, x, y });
			}
		}

		for (const pop of pops) {
			this.renderPop(graphics, pop, cellSize);
		}
	}

	/**
	 * A floating label over a token: it drifts up and fades over its life, in the
	 * colour its kind calls for - damage, a "Miss", or the green of restored HP.
	 * Drawn with a dark outline pass first so it stays legible over bright
	 * terrain.
	 */
	private renderPop(graphics: Graphics, pop: FloatingPop, cellSize: number): void {
		const t = clamp01(pop.age);
		const rise = UnitTheme.combatPop.rise * (1 - Math.pow(1 - t, 3));
		const fade = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);

		const centreX = pop.x + cellSize / 2;
		const centreY = pop.y + cellSize * 0.14 - rise;
		const color = UnitTheme.combatPop[pop.kind];

		graphics.alpha(fade);

		for (const [ox, oy] of POP_OUTLINE) {
			drawText(graphics, pop.text, centreX + ox, centreY + oy, { font: UITheme.badge, color: UnitTheme.combatPop.outline, align: TextAlign.CENTER });
		}

		drawText(graphics, pop.text, centreX, centreY, { font: UITheme.badge, color, align: TextAlign.CENTER });

		graphics.alpha(1);
	}

	/**
	 * Where to draw the token: its tile, or - while it is walking a move - the
	 * point it has reached along the path.
	 */
	private tileOf(entity: Entity): { column: number; row: number } {
		if (entity.hasComponent(WalkComponent)) {
			const walk = entity.getComponent(WalkComponent).read();
			return walkPoint(walk.path, walk.duration > 0 ? walk.elapsed / walk.duration : 1);
		}

		return entity.getComponent(GridPositionComponent).read();
	}

	private renderUnit(graphics: Graphics, unit: UnitData, anim: CombatAnimationData, x: number, y: number, cellSize: number): void {
		const colors = UnitTheme.faction[unit.faction];
		const centre = new Vector2D(x + cellSize / 2, y + cellSize / 2);
		const radius = (cellSize * UnitTheme.tokenSize) / 2;

		const tokenAlpha = anim.alpha * (unit.hasMoved ? UnitTheme.movedAlpha : 1);

		graphics.alpha(anim.alpha);
		graphics.fillColor(UnitTheme.shadow).fillCircle(new Circle(centre.x, centre.y + radius * 0.28, radius));

		graphics.alpha(tokenAlpha);
		graphics.fillColor(colors.body).fillCircle(new Circle(centre.x, centre.y, radius));

		graphics
			.strokeColor(UnitTheme.tokenOutline)
			.lineStyle({ width: UnitTheme.ringWidth + 2 })
			.strokeCircle(new Circle(centre.x, centre.y, radius));
		graphics
			.strokeColor(colors.ring)
			.lineStyle({ width: UnitTheme.ringWidth })
			.strokeCircle(new Circle(centre.x, centre.y, radius));

		if (unit.weapon !== null) {
			this.renderGlyph(graphics, unit.weapon.type, centre, radius, colors.glyph);
		}

		if (anim.flash > 0) {
			graphics.alpha(anim.alpha * anim.flash * 0.8);
			graphics.fillColor(UnitTheme.hitFlash).fillCircle(new Circle(centre.x, centre.y, radius));
		}

		if (anim.critFlash > 0) {
			graphics.alpha(anim.alpha * anim.critFlash);
			graphics
				.strokeColor(UnitTheme.critRing)
				.lineStyle({ width: 2 })
				.strokeCircle(new Circle(centre.x, centre.y, radius * (1 + (1 - anim.critFlash) * 1.4)));
		}

		graphics.alpha(1);

		if (anim.alpha > 0) {
			this.renderHealthBar(graphics, unit, anim === RESTING ? unit.currentHP : anim.hp, x, y, cellSize, colors.body);
		}
	}

	/**
	 * The HP bar under the token: a dark border, the empty track, then a fill in
	 * the unit's faction colour as wide as its remaining HP fraction. Runs the
	 * full width of the tile, pinned just inside the bottom edge. Full opacity
	 * regardless of `hasMoved` - a hurt unit needs to read as hurt even once it
	 * has acted.
	 */
	private renderHealthBar(graphics: Graphics, unit: UnitData, currentHP: number, x: number, y: number, cellSize: number, fillColor: Color): void {
		const maxHP = unit.stats.hp;

		if (maxHP <= 0) {
			return;
		}

		const ratio = clamp01(currentHP / maxHP);
		const height = UnitTheme.healthBarHeight;
		const width = cellSize - UnitTheme.healthBarPadding * 2;
		const left = x + UnitTheme.healthBarPadding;
		const top = y + cellSize - height - UnitTheme.healthBarInset;

		graphics.fillColor(UnitTheme.tokenOutline).fillRectangle(new Rectangle(left, top - 1, width, height + 2));
		graphics.fillColor(UnitTheme.health.track).fillRectangle(new Rectangle(left, top, width, height));

		const fill = Math.round(width * ratio);

		if (fill > 0) {
			graphics.fillColor(fillColor).fillRectangle(new Rectangle(left, top, fill, height));
		}
	}

	/** A schematic sword, axe or staff, drawn from a couple of strokes so no font is needed. */
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

		if (weapon === WeaponType.STAFF) {
			// Staff: a shaft down the middle with a small orb capping it, so a healer
			// reads at a glance as neither sword nor axe.
			graphics.drawLine(new Line(x, y - radius * 0.3, x, y + radius * 0.55));
			graphics.strokeCircle(new Circle(x, y - radius * 0.42, radius * 0.16));
			return;
		}

		// Sword: blade down the middle, a short crossguard near the hilt.
		graphics.drawLine(new Line(x, y - radius * 0.55, x, y + radius * 0.5));
		graphics.drawLine(new Line(x - radius * 0.32, y + radius * 0.22, x + radius * 0.32, y + radius * 0.22));
	}
}
