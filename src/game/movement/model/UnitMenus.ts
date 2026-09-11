import { i18n } from "@/core/i18n/I18n";
import { MenuRequest } from "@/game/ui/states/MenuState";
import { canUseItem, isUsableEntry } from "@/game/units/model/Inventory";
import { InventoryEntry, InventoryKind, STAT_NAMES, StatBoost, UnitData } from "@/game/units/model/UnitData";
import { PopupRequest } from "@/game/ui/states/PopupState";

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
	STAFF: "staff",
	VISIT: "visit",
	CHEST: "chest",
	DOOR: "door",
	TALK: "talk",
	ITEMS: "items",
	TRADE: "trade",
	WAIT: "wait",
	UNITS: "units",
	OPTIONS: "options",
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
	[UnitMenuRow.STAFF]: () => i18n("menu.staff"),
	[UnitMenuRow.VISIT]: () => i18n("menu.visit"),
	[UnitMenuRow.CHEST]: () => i18n("menu.chest"),
	[UnitMenuRow.DOOR]: () => i18n("menu.door"),
	[UnitMenuRow.TALK]: () => i18n("menu.talk"),
	[UnitMenuRow.ITEMS]: () => i18n("menu.items"),
	[UnitMenuRow.TRADE]: () => i18n("menu.trade"),
	[UnitMenuRow.WAIT]: () => i18n("menu.wait"),
	[UnitMenuRow.UNITS]: () => i18n("menu.units"),
	[UnitMenuRow.OPTIONS]: () => i18n("menu.options"),
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

/** What the unit can do from where it stands - what the command menu is built from. */
export interface UnitCommands {
	/** Something is in reach of a weapon it carries. */
	canAttack?: boolean;
	/** A wounded ally is in reach of a staff it carries. */
	canUseStaff?: boolean;
	/** It is standing beside the door of a house nobody has called on yet. */
	canVisit?: boolean;
	/** It is standing on or beside a locked chest and carries a key for it. */
	canOpenChest?: boolean;
	/** It is standing beside a locked door and carries a key for it. */
	canOpenDoor?: boolean;
	/** Someone beside it has a conversation left to have. */
	canTalk?: boolean;
	/** An ally is standing next to it. */
	canTrade?: boolean;
}

/**
 * The rows of the unit command menu, in Fire Emblem's order: "Attack" when
 * something is in reach, "Staff" when a wounded ally is in reach of a staff,
 * "Visit" when it is standing beside the door of a house nobody has called on,
 * "Chest" when it stands on or beside a locked chest with a key for it, "Door" when it
 * stands beside a locked door with a key for it, "Talk" when someone beside it
 * has something to say, "Items" when the unit carries anything, "Trade" when an
 * ally is standing next to it, then always "Wait".
 */
export function unitCommandRows(unit: UnitData, commands: UnitCommands = {}): UnitMenuRow[] {
	const rows: UnitMenuRow[] = [];

	if (commands.canAttack) {
		rows.push(UnitMenuRow.ATTACK);
	}

	if (commands.canUseStaff) {
		rows.push(UnitMenuRow.STAFF);
	}

	if (commands.canVisit) {
		rows.push(UnitMenuRow.VISIT);
	}

	if (commands.canOpenChest) {
		rows.push(UnitMenuRow.CHEST);
	}

	if (commands.canOpenDoor) {
		rows.push(UnitMenuRow.DOOR);
	}

	if (commands.canTalk) {
		rows.push(UnitMenuRow.TALK);
	}

	if (unit.inventory.length > 0) {
		rows.push(UnitMenuRow.ITEMS);
	}

	if (commands.canTrade) {
		rows.push(UnitMenuRow.TRADE);
	}

	rows.push(UnitMenuRow.WAIT);

	return rows;
}

/**
 * The menu opened on a tile with nothing to pick up: the army-wide commands.
 * "Units" opens the army list and "Options" the settings, neither of which
 * changes anything on the board; "End Turn" comes last, because it is the one
 * row here that cannot be taken back.
 */
export function globalCommandRequest(): Omit<MenuRequest, "anchor"> {
	return { id: GLOBAL_MENU, ...toRequestRows([row(UnitMenuRow.UNITS), row(UnitMenuRow.OPTIONS), row(UnitMenuRow.END_TURN)]), width: GLOBAL_MENU_WIDTH };
}

/** The unit command menu, tucked against the tile the unit stands on. */
export function unitCommandRequest(unit: UnitData, commands: UnitCommands = {}): Omit<MenuRequest, "anchor"> {
	return { id: COMMAND_MENU, ...toRequestRows(unitCommandRows(unit, commands).map(row)), width: COMMAND_MENU_WIDTH };
}

/**
 * The unit's pack: every carried weapon and item, the readied one badged,
 * durability right-aligned and anything the unit's class cannot wield greyed
 * out. It stays open after a row is confirmed so the per-item action menu can be
 * layered on top of it.
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
		disabled: unit.inventory.map((entry) => !isUsableEntry(entry)),
		width: ITEMS_MENU_WIDTH,
		selectedIndex: cursor,
		keepOpen: true,
		anchor
	};
}

/**
 * The per-item menu, Fire Emblem style: "Use" for a consumable that would do
 * something right now - a healing item while the unit is wounded, a stat
 * booster while a stat it raises is still below its cap - "Equip" / "Unequip"
 * for a weapon the class can wield, "Drop" for anything. A key is never "used"
 * from the pack; it is turned from the command menu, at the door or the chest.
 */
export function itemActionRows(unit: UnitData, entry: InventoryEntry): UnitMenuRow[] {
	const rows: UnitMenuRow[] = [];

	if (canUseItem(unit, entry)) {
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

/**
 * The notice shown after a stat booster is used - one line per stat it raised,
 * "Str +2" style, under the item's own name. Only the stats that actually
 * climbed are listed: a booster used at the cap has nothing to say about that
 * stat, and "Use" is not offered when it would have nothing to say at all.
 */
export function boostPopup(unitId: string, itemName: string, gains: StatBoost): PopupRequest {
	const lines = STAT_NAMES.filter((stat) => gains[stat] > 0).map((stat) => i18n("boost.gain", { stat: i18n(`roster.${stat}`), amount: gains[stat] }));

	return { id: `boost-${unitId}`, title: itemName, lines };
}
