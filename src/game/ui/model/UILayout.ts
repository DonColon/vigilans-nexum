import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { UITheme } from "@/game/ui/model/UITheme";

/** Gap between a UI panel and the edge of the screen. */
const SCREEN_MARGIN = 36;

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
export function menuBox(viewport: Dimension, itemCount: number, hasTitle: boolean, width = 320): Rectangle {
	const height = menuHeight(itemCount, hasTitle);

	const x = Math.round(viewport.width - width - SCREEN_MARGIN);
	const y = Math.round((viewport.height - height) / 2);

	return new Rectangle(x, y, width, height);
}
