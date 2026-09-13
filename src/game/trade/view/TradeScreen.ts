import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { menuHeight } from "@/game/ui/model/UILayout";
import { InventoryEntry, INVENTORY_SIZE, UnitData } from "@/game/units/model/UnitData";

/** Width of one pack panel - the same room the items menu gives a name and its uses. */
export const TRADE_PANEL_WIDTH = 320;

/** Gap between the two panels. */
export const TRADE_PANEL_GAP = 16;

/** Drawn in a slot that holds nothing, so an empty slot still reads as a place to put something. */
export const EMPTY_SLOT = "--";

/**
 * The rows of one pack panel: every slot of the pack, `null` where the unit
 * carries nothing. Both sides always show [[INVENTORY_SIZE]] rows - an empty
 * slot is where an item can be put down, so it has to be somewhere the cursor
 * can go.
 */
export function tradeSlots(unit: UnitData): (InventoryEntry | null)[] {
	return Array.from({ length: INVENTORY_SIZE }, (_, index) => unit.inventory[index] ?? null);
}

/**
 * Where the two panels sit: side by side and centred on the screen, the unit's
 * own pack on the left. Both are the same size, so the two cursors line up row
 * for row.
 */
export function tradePanels(viewport: Dimension): { left: Rectangle; right: Rectangle } {
	const height = menuHeight(INVENTORY_SIZE, true);
	const width = TRADE_PANEL_WIDTH * 2 + TRADE_PANEL_GAP;

	const x = Math.round((viewport.width - width) / 2);
	const y = Math.round((viewport.height - height) / 2);

	return {
		left: new Rectangle(x, y, TRADE_PANEL_WIDTH, height),
		right: new Rectangle(x + TRADE_PANEL_WIDTH + TRADE_PANEL_GAP, y, TRADE_PANEL_WIDTH, height)
	};
}
