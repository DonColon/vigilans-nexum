import { AssetStorage } from "@/core/assets/AssetStorage";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { TextBaseline } from "@/core/graphics/styles/text/TextBaseline";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { drawNineSlice, NineSlice } from "@/game/ui/model/NineSlice";
import { UITheme } from "@/game/ui/model/UITheme";

export interface PanelTextStyle {
	font: FontStyleSettings;
	color: Color;
	/** Defaults to left-aligned. */
	align?: TextAlignType;
}

/**
 * Draws one line of text with its optical centre - the middle of the cap
 * height, not the em box - on `centreY`. Pixel fonts sit oddly in the em box,
 * so `textBaseline: "middle"` leaves them looking high or low; this places the
 * baseline by hand from the font's cap ratio instead.
 */
export function drawText(graphics: Graphics, value: string, x: number, centreY: number, style: PanelTextStyle): void {
	const size = parseInt(style.font.size ?? "16", 10);
	const baseline = Math.round(centreY + (size * UITheme.capRatio) / 2);

	graphics
		.fontStyle(style.font)
		.textStyle({ align: style.align ?? TextAlign.LEFT, baseline: TextBaseline.ALPHABETIC })
		.fillColor(style.color);
	graphics.fillText(value, x, baseline);
}

/**
 * Whether the UI sprites have finished loading. The panels cannot be drawn
 * before the bundle carrying them is in storage, a frame or two after the
 * feature is installed. The art ships as single-frame spritesheets purely so
 * the raw `HTMLImageElement` behind it stays reachable for nine-slicing.
 */
export function uiAssetsReady(assets: AssetStorage): boolean {
	return assets.hasSpritesheet(UITheme.assets.panel) && assets.hasSpritesheet(UITheme.assets.frame) && assets.hasSpritesheet(UITheme.assets.divider);
}

function nineSlice(assets: AssetStorage, id: string): NineSlice {
	return { image: assets.getSpritesheet(id).getImage(), corner: UITheme.nineSlice.corner };
}

/**
 * Draws a framed panel across `bounds`: the filled Kenney body tinted to the
 * theme fill, the ornate ring tinted to the theme edge over it and a hairline
 * just inside the ring so text has a clean edge to sit against.
 */
export function drawPanel(graphics: Graphics, assets: AssetStorage, bounds: Rectangle): void {
	graphics.imageSmoothing();

	drawNineSlice(graphics, nineSlice(assets, UITheme.assets.panel), bounds, UITheme.panelFill);
	drawNineSlice(graphics, nineSlice(assets, UITheme.assets.frame), bounds, UITheme.panelEdge);

	const inset = UITheme.nineSlice.corner / 2;
	const { x, y } = bounds.getPosition();
	const keyline = new Rectangle(x + inset, y + inset, bounds.getWidth() - 2 * inset, bounds.getHeight() - 2 * inset);

	graphics.strokeColor(UITheme.panelInline).lineStyle({ width: 1 }).strokeRectangle(keyline);
}

/**
 * Marks the selected menu row: a faint wash plus four corner brackets, the same
 * cursor the map draws around a tile, just not pulsing. The brackets sit on the
 * row's corners and leave the middle of every edge open, so the label stays
 * fully clear of them.
 */
export function drawMenuHighlight(graphics: Graphics, row: Rectangle): void {
	graphics.fillColor(UITheme.menuSelectionFill).fillRectangle(row);

	const brackets = cornerBrackets(row, UITheme.menuCursorBracket);

	graphics.strokeColor(UITheme.menuCursorOutline).lineStyle({ width: UITheme.menuCursorWidth + 2 });
	for (const bracket of brackets) {
		graphics.drawLine(bracket);
	}

	graphics.strokeColor(UITheme.menuCursor).lineStyle({ width: UITheme.menuCursorWidth });
	for (const bracket of brackets) {
		graphics.drawLine(bracket);
	}
}

/** The eight line segments - an L at each corner - that frame `rect`. */
function cornerBrackets(rect: Rectangle, ratio: number): Line[] {
	const { topLeft, topRight, bottomLeft, bottomRight } = rect.getCorners();
	const arm = Math.min(rect.getWidth(), rect.getHeight()) * ratio;

	return [
		new Line(topLeft.x, topLeft.y, topLeft.x + arm, topLeft.y),
		new Line(topLeft.x, topLeft.y, topLeft.x, topLeft.y + arm),
		new Line(topRight.x, topRight.y, topRight.x - arm, topRight.y),
		new Line(topRight.x, topRight.y, topRight.x, topRight.y + arm),
		new Line(bottomLeft.x, bottomLeft.y, bottomLeft.x + arm, bottomLeft.y),
		new Line(bottomLeft.x, bottomLeft.y, bottomLeft.x, bottomLeft.y - arm),
		new Line(bottomRight.x, bottomRight.y, bottomRight.x - arm, bottomRight.y),
		new Line(bottomRight.x, bottomRight.y, bottomRight.x, bottomRight.y - arm)
	];
}

/**
 * Draws the Kenney divider flourish centred on `y`, stretched to `width`. Used
 * between a menu title and its rows.
 */
export function drawDivider(graphics: Graphics, assets: AssetStorage, x: number, y: number, width: number): void {
	const sheet = assets.getSpritesheet(UITheme.assets.divider);
	const image = sheet.getImage();

	graphics.imageSmoothing();

	// The divider has no meaningful corners; a straight horizontal stretch keeps
	// its centre flourish readable.
	drawNineSlice(graphics, { image, corner: Math.min(image.width, image.height) / 2 - 1 }, new Rectangle(x, y - image.height / 2, width, image.height), UITheme.panelEdge);
}
