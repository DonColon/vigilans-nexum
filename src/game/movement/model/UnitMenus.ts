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
 * Menu row labels, resolved fresh on every call so a locale switch is picked
 * up. The rows are matched back by label when the menu reports a choice, so
 * building a menu and reading its outcome have to go through the same helpers.
 */
export const MenuLabel = {
	attack: () => i18n("menu.attack"),
	wait: () => i18n("menu.wait"),
	endTurn: () => i18n("menu.endTurn"),
	items: () => i18n("menu.items"),
	equip: () => i18n("menu.equip"),
	unequip: () => i18n("menu.unequip"),
	use: () => i18n("menu.use"),
	drop: () => i18n("menu.drop")
} as const;

/**
 * The rows of the unit command menu: "Attack" when something is in reach,
 * "Items" when the unit carries anything, then always "Wait".
 */
export function unitCommandRows(unit: UnitData, canAttack: boolean): string[] {
	const rows: string[] = [];

	if (canAttack) {
		rows.push(MenuLabel.attack());
	}

	if (unit.inventory.length > 0) {
		rows.push(MenuLabel.items());
	}

	rows.push(MenuLabel.wait());

	return rows;
}

/** The menu opened on a tile with nothing to pick up: the army-wide commands. */
export function globalCommandRequest(): Omit<MenuRequest, "anchor"> {
	return { id: GLOBAL_MENU, items: [MenuLabel.endTurn()], width: GLOBAL_MENU_WIDTH };
}

/** The unit command menu, tucked against the tile the unit stands on. */
export function unitCommandRequest(unit: UnitData, canAttack: boolean): Omit<MenuRequest, "anchor"> {
	return { id: COMMAND_MENU, items: unitCommandRows(unit, canAttack), width: COMMAND_MENU_WIDTH };
}

/**
 * The unit's pack: every carried weapon and item, the readied one badged and
 * durability right-aligned. It stays open after a row is confirmed so the
 * per-item action menu can be layered on top of it.
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
		title: MenuLabel.items(),
		items: unit.inventory.map((entry) => entry.name),
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
export function itemActionRows(unit: UnitData, entry: InventoryEntry): string[] {
	const rows: string[] = [];

	if (entry.item !== null && isHealingItem(entry) && healingAmount(unit, entry.item) > 0) {
		rows.push(MenuLabel.use());
	}

	if (entry.kind === InventoryKind.WEAPON && entry.equippable) {
		rows.push(entry.equipped ? MenuLabel.unequip() : MenuLabel.equip());
	}

	rows.push(MenuLabel.drop());

	return rows;
}

/** The action menu for one pack entry, positioned against the items panel. */
export function itemActionRequest(unit: UnitData, entry: InventoryEntry, position: { x: number; y: number }): MenuRequest {
	return { id: ITEM_ACTION_MENU, title: entry.name, items: itemActionRows(unit, entry), width: ITEM_ACTION_MENU_WIDTH, position };
}
