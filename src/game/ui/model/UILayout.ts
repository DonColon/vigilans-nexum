import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { MapTheme } from "@/game/map/model/MapTheme";
import { UITheme } from "@/game/ui/model/UITheme";

/** Gap between a UI panel and the edge of the screen. */
const SCREEN_MARGIN = 36;

/** Width a menu panel gets when the caller does not ask for one. */
export const DEFAULT_MENU_WIDTH = 320;

/** Widest a dialog box is allowed to get, however wide the screen is. */
const DIALOG_MAX_WIDTH = 920;

/** Body lines a dialog page is laid out for. Pages are authored to fit this; the box height does not change between pages. */
export const DIALOG_BODY_LINES = 4;

/**
 * Which edge of the screen a textbox is pinned to. Radiant Dawn puts the one who
 * opens a conversation along the top and whoever answers along the bottom, so
 * the two speakers hold their own half of the screen for its whole length.
 */
export const DialogSide = {
	TOP: "top",
	BOTTOM: "bottom"
} as const;

export type DialogSide = (typeof DialogSide)[keyof typeof DialogSide];

/**
 * Where the textbox sits: a fixed-height panel spanning most of the screen
 * width, pinned to one edge the way a Fire Emblem conversation box is. The state
 * positions the entity from `getPosition()`, the render system draws the whole
 * rectangle - deriving both from here keeps them in agreement.
 */
export function dialogBox(viewport: Dimension, side: DialogSide = DialogSide.BOTTOM): Rectangle {
	const width = Math.min(DIALOG_MAX_WIDTH, viewport.width - 2 * SCREEN_MARGIN);
	const height = UITheme.padding * 2 + UITheme.lineHeight + DIALOG_BODY_LINES * UITheme.lineHeight;

	const x = Math.round((viewport.width - width) / 2);
	const y = side === DialogSide.TOP ? SCREEN_MARGIN : Math.round(viewport.height - height - SCREEN_MARGIN);

	return new Rectangle(x, y, width, height);
}

/** Width of a notice panel. Fixed: a popup says one short thing, and a box that resized around it would jump about. */
export const POPUP_WIDTH = 520;

/** Height a notice panel needs for its heading and lines. */
export function popupHeight(lineCount: number, hasTitle: boolean): number {
	return UITheme.padding * 2 + (hasTitle ? UITheme.lineHeight : 0) + lineCount * UITheme.lineHeight;
}

/**
 * Where a notice sits: dead centre of the screen, sized to its lines. Fire
 * Emblem puts its "you got an item" box in the middle and stops everything else
 * until it is acknowledged, which is what the middle is for.
 */
export function popupBox(viewport: Dimension, lineCount: number, hasTitle: boolean): Rectangle {
	const width = Math.min(POPUP_WIDTH, viewport.width - 2 * SCREEN_MARGIN);
	const height = popupHeight(lineCount, hasTitle);

	return new Rectangle(Math.round((viewport.width - width) / 2), Math.round((viewport.height - height) / 2), width, height);
}

/** Height a menu panel needs for its title and rows. */
export function menuHeight(itemCount: number, hasTitle: boolean): number {
	const rows = itemCount * UITheme.lineHeight;
	const title = hasTitle ? UITheme.lineHeight + UITheme.padding / 2 : 0;
	return UITheme.padding * 2 + title + rows;
}

/**
 * Where a menu sits: a panel sized to its contents, tucked against the
 * right-hand side of the screen and vertically centred - clear of the map
 * cursor, roughly where a unit command menu lands.
 */
export function menuBox(viewport: Dimension, itemCount: number, hasTitle: boolean, width = DEFAULT_MENU_WIDTH): Rectangle {
	const height = menuHeight(itemCount, hasTitle);

	const x = Math.round(viewport.width - width - SCREEN_MARGIN);
	const y = Math.round((viewport.height - height) / 2);

	return new Rectangle(x, y, width, height);
}

/**
 * A menu tucked against a point on the map - a selected unit's tile. It sits to
 * the right of the anchor, flips to the left when that would run off the edge,
 * and is vertically centred on the tile's middle. The whole panel is then nudged
 * to stay on screen. `cell` is the map tile size, so the panel clears the token
 * rather than covering it.
 */
export function menuBeside(viewport: Dimension, anchor: { x: number; y: number }, width: number, height: number, cell: number = MapTheme.cellSize): Rectangle {
	const gap = 10;

	let x = anchor.x + cell + gap;

	if (x + width + SCREEN_MARGIN > viewport.width) {
		x = anchor.x - gap - width;
	}

	x = Math.max(SCREEN_MARGIN, Math.min(x, viewport.width - width - SCREEN_MARGIN));

	// Line the middle of the panel up with the middle of the tile.
	const centredY = anchor.y + cell / 2 - height / 2;
	const y = Math.max(SCREEN_MARGIN, Math.min(centredY, viewport.height - height - SCREEN_MARGIN));

	return new Rectangle(Math.round(x), Math.round(y), width, height);
}

/**
 * A menu placed at an exact top-left point - for a panel positioned relative to
 * another panel rather than to the map. Only nudged to stay on screen.
 */
export function menuAt(viewport: Dimension, position: { x: number; y: number }, width: number, height: number): Rectangle {
	const x = Math.max(SCREEN_MARGIN, Math.min(position.x, viewport.width - width - SCREEN_MARGIN));
	const y = Math.max(SCREEN_MARGIN, Math.min(position.y, viewport.height - height - SCREEN_MARGIN));

	return new Rectangle(Math.round(x), Math.round(y), width, height);
}
