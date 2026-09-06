import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
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
 * Where the textbox sits: a fixed-height panel spanning most of the screen
 * width, pinned to the bottom the way a Fire Emblem conversation box is. The
 * state positions the entity from `getPosition()`, the render system draws the
 * whole rectangle - deriving both from here keeps them in agreement.
 */
export function dialogBox(viewport: Dimension): Rectangle {
	const width = Math.min(DIALOG_MAX_WIDTH, viewport.width - 2 * SCREEN_MARGIN);
	const height = UITheme.padding * 2 + UITheme.lineHeight + DIALOG_BODY_LINES * UITheme.lineHeight;

	const x = Math.round((viewport.width - width) / 2);
	const y = Math.round(viewport.height - height - SCREEN_MARGIN);

	return new Rectangle(x, y, width, height);
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
 * and is nudged so the whole panel stays on screen. `cell` is the map tile size,
 * so the panel clears the token rather than covering it.
 */
export function menuBeside(viewport: Dimension, anchor: { x: number; y: number }, width: number, height: number, cell = 24): Rectangle {
	const gap = 10;

	let x = anchor.x + cell + gap;

	if (x + width + SCREEN_MARGIN > viewport.width) {
		x = anchor.x - gap - width;
	}

	x = Math.max(SCREEN_MARGIN, Math.min(x, viewport.width - width - SCREEN_MARGIN));
	const y = Math.max(SCREEN_MARGIN, Math.min(anchor.y, viewport.height - height - SCREEN_MARGIN));

	return new Rectangle(Math.round(x), Math.round(y), width, height);
}
