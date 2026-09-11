import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Circle } from "@/core/math/geometry/Circle";
import { Line } from "@/core/math/geometry/Line";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { UnitFaction, WeaponType } from "@/game/units/model/UnitData";
import { UnitTheme } from "@/game/units/model/UnitTheme";

/**
 * The unit token itself - the faction-coloured disc, its dark-then-light ring
 * and the schematic weapon glyph on it - drawn at any size. The map draws one
 * per unit at tile size (UnitRenderSystem); the status screen and the hover
 * card draw the same disc bigger, so a unit looks like itself wherever it is
 * shown. The shadow, the HP bar and the hit flash stay with the map renderer:
 * they belong to a token standing on a tile.
 */
export function drawUnitToken(graphics: Graphics, faction: UnitFaction, weapon: WeaponType | null, centre: Vector2D, radius: number): void {
	const colors = UnitTheme.faction[faction];

	graphics.fillColor(colors.body).fillCircle(new Circle(centre.x, centre.y, radius));

	graphics
		.strokeColor(UnitTheme.tokenOutline)
		.lineStyle({ width: UnitTheme.ringWidth + 2 })
		.strokeCircle(new Circle(centre.x, centre.y, radius));
	graphics
		.strokeColor(colors.ring)
		.lineStyle({ width: UnitTheme.ringWidth })
		.strokeCircle(new Circle(centre.x, centre.y, radius));

	if (weapon !== null) {
		drawWeaponGlyph(graphics, weapon, centre, radius, colors.glyph);
	}
}

/** A schematic sword, axe or staff, drawn from a couple of strokes so no font is needed - a dark pass under a light one. */
export function drawWeaponGlyph(graphics: Graphics, weapon: WeaponType, centre: Vector2D, radius: number, color: Color): void {
	graphics.strokeColor(UnitTheme.tokenOutline).lineStyle({ width: UnitTheme.glyphWidth + 2 });
	glyphStrokes(graphics, weapon, centre, radius);

	graphics.strokeColor(color).lineStyle({ width: UnitTheme.glyphWidth });
	glyphStrokes(graphics, weapon, centre, radius);
}

function glyphStrokes(graphics: Graphics, weapon: WeaponType, centre: Vector2D, radius: number): void {
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
