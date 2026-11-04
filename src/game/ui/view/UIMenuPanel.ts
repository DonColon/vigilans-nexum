import { AssetStorage } from "@/core/assets/AssetStorage";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { MenuData, MenuStyle } from "@/game/ui/components/MenuComponent";
import { BADGE_DIAMETER, drawBadge, drawDivider, drawMenuFrame, drawMenuHighlight, drawPanel, drawText } from "@/game/ui/view/UIPanel";
import { BARE_ROW_GAP, bareRowPitch } from "@/game/ui/view/UILayout";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * Draws one menu at its top-left point, whichever style it is - the framed
 * panel with its rows in columns, or the bare rows of the title menu. Shared
 * by the UI render systems, so a menu looks the same wherever in the frame
 * order it is drawn.
 */
export function drawMenu(graphics: Graphics, assets: AssetStorage, data: MenuData, x: number, y: number): void {
	if (data.style === MenuStyle.BARE) {
		drawBareMenu(graphics, assets, data, x, y);
		return;
	}

	const hasTitle = data.title.length > 0;
	const box = new Rectangle(x, y, data.width, data.height);

	drawPanel(graphics, assets, box);

	let slotTop = y + UITheme.padding;

	if (hasTitle) {
		drawText(graphics, data.title, x + box.getWidth() / 2, slotTop + UITheme.lineHeight / 2, { font: UITheme.name, color: UITheme.menuTitle, align: TextAlign.CENTER });
		slotTop += UITheme.lineHeight;
		drawDivider(graphics, assets, x + UITheme.padding, slotTop, box.getWidth() - 2 * UITheme.padding);
		slotTop += UITheme.padding / 2;
	}

	// The bracket cursor sits a couple of pixels in from the panel keyline so
	// its arms never touch the frame.
	const inset = UITheme.nineSlice.corner / 2 + 2;

	// A left gutter for the badge discs, reserved for every row only when some
	// row actually carries one, so a plain menu is unchanged.
	const badged = data.badges.some((badge) => badge.length > 0);
	const gutter = badged ? BADGE_DIAMETER + 8 : 0;

	// The rows fill the panel's columns left to right and then down; a
	// one-column menu is one cell wide, the whole panel between the insets.
	const columns = Math.max(1, data.columns);
	const cellWidth = (box.getWidth() - 2 * inset) / columns;
	const cellPadding = UITheme.padding - inset;

	for (const [index, item] of data.items.entries()) {
		const cellLeft = x + inset + (index % columns) * cellWidth;
		const rowTop = slotTop + Math.floor(index / columns) * UITheme.lineHeight;
		const centreY = rowTop + UITheme.lineHeight / 2;

		if (index === data.selectedIndex) {
			const row = new Rectangle(Math.round(cellLeft), rowTop + 1, Math.round(cellWidth), UITheme.lineHeight - 2);
			drawMenuHighlight(graphics, row);
		}

		const badge = data.badges[index] ?? "";

		if (badge.length > 0) {
			drawBadge(graphics, badge, Math.round(cellLeft + cellPadding + BADGE_DIAMETER / 2), centreY);
		}

		const color = menuRowColor(index === data.selectedIndex, data.disabled[index] ?? false);
		drawText(graphics, item, Math.round(cellLeft + cellPadding + gutter), centreY, { font: UITheme.menu, color, align: TextAlign.LEFT });

		const value = data.values[index] ?? "";

		if (value.length > 0) {
			drawText(graphics, value, Math.round(cellLeft + cellWidth - cellPadding), centreY, { font: UITheme.menu, color, align: TextAlign.RIGHT });
		}
	}
}

/**
 * A bare menu: no panel, every row centred on the menu's width with air
 * between them, and the selected one framed by the select border - Kenney's
 * sample title menu. Badges and values have no place here and are not drawn.
 */
function drawBareMenu(graphics: Graphics, assets: AssetStorage, data: MenuData, x: number, y: number): void {
	const centreX = x + data.width / 2;
	let slotTop = y;

	if (data.title.length > 0) {
		drawText(graphics, data.title, centreX, slotTop + UITheme.lineHeight / 2, { font: UITheme.name, color: UITheme.menuTitle, align: TextAlign.CENTER });
		slotTop += UITheme.lineHeight + BARE_ROW_GAP;
	}

	for (const [index, item] of data.items.entries()) {
		const rowTop = slotTop + index * bareRowPitch();
		const centreY = rowTop + UITheme.lineHeight / 2;
		const selected = index === data.selectedIndex;

		if (selected) {
			// The frame encloses the row's line height; its corner squares reach into the gap.
			drawMenuFrame(graphics, assets, new Rectangle(x, rowTop, data.width, UITheme.lineHeight));
		}

		drawText(graphics, item, centreX, centreY, { font: UITheme.menu, color: menuRowColor(selected, data.disabled[index] ?? false), align: TextAlign.CENTER });
	}
}

/** The four states a menu row can be drawn in: live or greyed out, under the cursor or not. */
export function menuRowColor(selected: boolean, disabled: boolean): Color {
	if (disabled) {
		return selected ? UITheme.menuItemDisabledSelected : UITheme.menuItemDisabled;
	}

	return selected ? UITheme.menuItemSelected : UITheme.menuItem;
}
