import { i18n } from "@/core/i18n/I18n";
import { MenuRequest } from "@/game/ui/states/MenuState";
import { healingAmount, isHealingItem } from "@/game/units/model/Inventory";
import { InventoryEntry, InventoryKind, UnitData } from "@/game/units/model/UnitData";

/** Menu ids, echoed by the `ui:menu*` events. */
export const COMMAND_MENU = "unit-command";
export const GLOBAL_MENU = "global-command";
export const ITEMS_MENU = "unit-items";
export const ITEM_ACTION_MENU = "unit-item-action";

export const COMMAND_MENU_WIDTH = 160;
export const GLOBAL_MENU_WIDTH = 190;
export const ITEMS_MENU_WIDTH = 300;
export const ITEM_ACTION_MENU_WIDTH = 190;

/** Gap between the items panel and the action submenu tucked against its right edge. */
export const ITEM_ACTION_MENU_GAP = 4;

/**
 * The rows these menus can offer, by the id `ui:menuConfirmed` reports. The
 * labels beside them are translated and change with the locale; these do not,
 * which is what the move flow branches on.
 */
export const UnitMenuRow = {
	ATTACK: "attack",
	ITEMS: "items",
	WAIT: "wait",
	END_TURN: "end-turn",
	USE: "use",
	EQUIP: "equip",
	UNEQUIP: "unequip",
	DROP: "drop"
} as const;

export type UnitMenuRow = (typeof UnitMenuRow)[keyof typeof UnitMenuRow];

/** One row of a menu: the id it reports and the label the player reads. */
interface Row {
	id: string;
	label: string;
}

/** The label of every row, resolved fresh so a locale switch is picked up. */
const LABELS: Record<UnitMenuRow, () => string> = {
	[UnitMenuRow.ATTACK]: () => i18n("menu.attack"),
	[UnitMenuRow.ITEMS]: () => i18n("menu.items"),
	[UnitMenuRow.WAIT]: () => i18n("menu.wait"),
	[UnitMenuRow.END_TURN]: () => i18n("menu.endTurn"),
	[UnitMenuRow.USE]: () => i18n("menu.use"),
	[UnitMenuRow.EQUIP]: () => i18n("menu.equip"),
	[UnitMenuRow.UNEQUIP]: () => i18n("menu.unequip"),
	[UnitMenuRow.DROP]: () => i18n("menu.drop")
} as const;

/** The label shown for a row - for a caller that needs the text rather than the id. */
export function rowLabel(row: UnitMenuRow): string {
	return LABELS[row]();
}

function row(id: UnitMenuRow): Row {
	return { id, label: rowLabel(id) };
}

/** Splits the rows into the parallel `items` / `ids` arrays a [[MenuRequest]] carries. */
function toRequestRows(rows: readonly Row[]): { items: string[]; ids: string[] } {
	return { items: rows.map((entry) => entry.label), ids: rows.map((entry) => entry.id) };
}

/**
 * The rows of the unit command menu: "Attack" when something is in reach,
 * "Items" when the unit carries anything, then always "Wait".
 */
export function unitCommandRows(unit: UnitData, canAttack: boolean): UnitMenuRow[] {
	const rows: UnitMenuRow[] = [];

	if (canAttack) {
		rows.push(UnitMenuRow.ATTACK);
	}

	if (unit.inventory.length > 0) {
		rows.push(UnitMenuRow.ITEMS);
	}

	rows.push(UnitMenuRow.WAIT);

	return rows;
}

/** The menu opened on a tile with nothing to pick up: the army-wide commands. */
export function globalCommandRequest(): Omit<MenuRequest, "anchor"> {
	return { id: GLOBAL_MENU, ...toRequestRows([row(UnitMenuRow.END_TURN)]), width: GLOBAL_MENU_WIDTH };
}

/** The unit command menu, tucked against the tile the unit stands on. */
export function unitCommandRequest(unit: UnitData, canAttack: boolean): Omit<MenuRequest, "anchor"> {
	return { id: COMMAND_MENU, ...toRequestRows(unitCommandRows(unit, canAttack).map(row)), width: COMMAND_MENU_WIDTH };
}

/**
 * The unit's pack: every carried weapon and item, the readied one badged and
 * durability right-aligned. It stays open after a row is confirmed so the
 * per-item action menu can be layered on top of it.
 *
 * The rows report the catalog id of the entry they show. Which pack *slot* that
 * is stays with the reported index - a unit can carry the same item twice.
 */
export function itemsRequest(unit: UnitData, anchor: { x: number; y: number }, selectedIndex?: number): MenuRequest {
	const cursor =
		selectedIndex ??
		Math.max(
			0,
			unit.inventory.findIndex((entry) => entry.equipped)
		);

	return {
		id: ITEMS_MENU,
		title: rowLabel(UnitMenuRow.ITEMS),
		items: unit.inventory.map((entry) => entry.name),
		ids: unit.inventory.map((entry) => entry.id),
		badges: unit.inventory.map((entry) => (entry.equipped ? i18n("menu.equipped") : "")),
		values: unit.inventory.map((entry) => `${entry.uses}/${entry.maxUses}`),
		width: ITEMS_MENU_WIDTH,
		selectedIndex: cursor,
		keepOpen: true,
		anchor
	};
}

/**
 * The per-item menu, Fire Emblem style: "Use" for a healing item that would
 * restore HP, "Equip" / "Unequip" for a weapon the class can wield, "Drop" for
 * anything.
 */
export function itemActionRows(unit: UnitData, entry: InventoryEntry): UnitMenuRow[] {
	const rows: UnitMenuRow[] = [];

	if (entry.item !== null && isHealingItem(entry) && healingAmount(unit, entry.item) > 0) {
		rows.push(UnitMenuRow.USE);
	}

	if (entry.kind === InventoryKind.WEAPON && entry.equippable) {
		rows.push(entry.equipped ? UnitMenuRow.UNEQUIP : UnitMenuRow.EQUIP);
	}

	rows.push(UnitMenuRow.DROP);

	return rows;
}

/** The action menu for one pack entry, positioned against the items panel. */
export function itemActionRequest(unit: UnitData, entry: InventoryEntry, position: { x: number; y: number }): MenuRequest {
	return {
		id: ITEM_ACTION_MENU,
		title: entry.name,
		...toRequestRows(itemActionRows(unit, entry).map(row)),
		width: ITEM_ACTION_MENU_WIDTH,
		position
	};
}
