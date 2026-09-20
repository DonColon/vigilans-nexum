import { Color } from "@/core/graphics/color/Color";
import { i18n } from "@/core/i18n/I18n";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { InventoryKind, UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { RosterRequest } from "@/game/roster/states/RosterState";
import { MenuRequest } from "@/game/ui/states/MenuState";
import { menuHeight, SCREEN_MARGIN } from "@/game/ui/view/UILayout";
import { UITheme } from "@/game/ui/view/UITheme";

/**
 * The preparations screen's menus and the layout of its items screen. Every
 * menu is the UI feature's; this only says what goes in them, where they sit
 * and names them so `ui:menuConfirmed` can be told apart.
 *
 * The items screen is laid out in three panels: the army list across the top
 * third of the screen, the highlighted unit's pack under it on the left, and
 * the right-hand half for whatever the pack is worked against - the pack
 * menu (Convoy / Trade / Equip / Use), the convoy, or a partner's pack.
 */

export const PREPARE_MENU = "prepare";
export const ARMY_MENU = "prepare-army";
export const PACK_MENU = "prepare-pack";
export const EQUIP_MENU = "prepare-equip";
export const USE_MENU = "prepare-use";

export const PREPARE_MENU_WIDTH = 220;
export const PACK_MENU_WIDTH = 220;

/** Air between the screen's panels and the edge of the viewport - the UI's own margin, which a positioned menu is nudged in to anyway. */
export const SCREEN_EDGE = SCREEN_MARGIN;

/** Air between two panels of the items screen. */
export const PANEL_GAP = 12;

/** Room one column of the army list gets: a name and its "Bench" mark. */
export const ARMY_COLUMN_WIDTH = 320;

/** Rows of the preparations menu. */
export const PrepareRow = {
	UNITS: "units",
	FORMATION: "formation",
	ITEMS: "items",
	BEGIN: "begin"
} as const;

export type PrepareRow = (typeof PrepareRow)[keyof typeof PrepareRow];

/** Rows of the pack menu - what may be done with a unit's pack before the battle. */
export const PackAction = {
	CONVOY: "convoy",
	TRADE: "trade",
	EQUIP: "equip",
	USE: "use"
} as const;

export type PackAction = (typeof PackAction)[keyof typeof PackAction];

const PREPARE_ROWS: PrepareRow[] = [PrepareRow.UNITS, PrepareRow.FORMATION, PrepareRow.ITEMS, PrepareRow.BEGIN];
const PACK_ROWS: PackAction[] = [PackAction.CONVOY, PackAction.TRADE, PackAction.EQUIP, PackAction.USE];

/** Where the preparations menu sits: dead centre of the screen. */
export function prepareMenuPosition(viewport: Dimension): { x: number; y: number } {
	const height = menuHeight(PREPARE_ROWS.length, true);

	return { x: Math.round((viewport.width - PREPARE_MENU_WIDTH) / 2), y: Math.round((viewport.height - height) / 2) };
}

/** The preparations menu: what to adjust, and the row that starts the battle. */
export function prepareMenuRequest(viewport: Dimension, selectedIndex = 0): MenuRequest {
	return {
		id: PREPARE_MENU,
		title: i18n("prepare.title"),
		items: PREPARE_ROWS.map((row) => i18n(`prepare.${row}`)),
		ids: [...PREPARE_ROWS],
		width: PREPARE_MENU_WIDTH,
		selectedIndex,
		position: prepareMenuPosition(viewport)
	};
}

/** One line of the deploy list: a unit of the army, and whether it takes the field. */
export interface PickEntry {
	unit: UnitData;
	onMap: boolean;
	required: boolean;
}

/**
 * The deploy list - the same stat table the map's "Units" row opens, with
 * every unit of the army on it: the ones on the map marked so, the required
 * ones greyed out (they still select, the flow just does nothing with them),
 * the benched ones drawn from their roster sheets. The title counts the
 * deployed against the capacity, and confirming a row deploys or benches.
 */
export function pickRosterRequest(entries: readonly PickEntry[], deployedCount: number, capacity: number, selectedIndex = 0): RosterRequest {
	return {
		title: i18n("prepare.pick", { deployed: deployedCount, capacity }),
		unitIds: entries.map((entry) => entry.unit.id),
		sheets: entries.filter((entry) => !entry.onMap).map((entry) => entry.unit),
		status: entries.map((entry) => (entry.required ? i18n("prepare.required") : entry.onMap ? i18n("prepare.onMap") : i18n("prepare.bench"))),
		disabled: entries.map((entry) => entry.required),
		selectable: true,
		selectedIndex
	};
}

// --- the items screen's layout ---------------------------------------------

/** The army list's panel: the whole width of the screen, the top third of its height. */
export function armyBox(viewport: Dimension): Rectangle {
	const height = Math.round(viewport.height / 3) - SCREEN_EDGE - PANEL_GAP / 2;

	return new Rectangle(SCREEN_EDGE, SCREEN_EDGE, viewport.width - 2 * SCREEN_EDGE, height);
}

/** How many columns the army list is laid out in - as many as the panel has room for. */
export function armyColumns(viewport: Dimension): number {
	return Math.max(1, Math.floor((armyBox(viewport).getWidth() - 2 * UITheme.padding) / ARMY_COLUMN_WIDTH));
}

/** The pack panel: under the army list, the left half of the screen, down to the bottom. */
export function packBox(viewport: Dimension): Rectangle {
	const top = Math.round(viewport.height / 3) + PANEL_GAP / 2;

	return new Rectangle(SCREEN_EDGE, top, Math.round(viewport.width / 2) - SCREEN_EDGE - PANEL_GAP / 2, viewport.height - top - SCREEN_EDGE);
}

/** The right-hand panel: beside the pack panel, the same size - the convoy or a partner's pack. */
export function otherBox(viewport: Dimension): Rectangle {
	const pack = packBox(viewport);

	return new Rectangle(Math.round(viewport.width / 2) + PANEL_GAP / 2, pack.getPosition().y, pack.getWidth(), pack.getHeight());
}

/** Where the pack menu sits: the top of the right-hand half, beside the pack panel. */
export function packMenuPosition(viewport: Dimension): { x: number; y: number } {
	const { x, y } = otherBox(viewport).getPosition();

	return { x, y };
}

/** How many slot rows a pack panel this tall shows under its title. */
export function panelRows(box: Rectangle): number {
	return Math.max(1, Math.floor((box.getHeight() - 2 * UITheme.padding - UITheme.lineHeight - UITheme.padding / 2) / UITheme.lineHeight));
}

/**
 * The first of `rows` rows shown out of `count`, so that the row at `cursor`
 * is on screen: the list scrolls with the cursor and never past its end. A
 * list that fits shows from the top.
 */
export function scrolledFrom(count: number, cursor: number, rows: number): number {
	if (count <= rows) {
		return 0;
	}

	return Math.max(0, Math.min(cursor - rows + 1, count - rows, Math.max(0, cursor)));
}

// --- the items screen's menus ----------------------------------------------

/** One line of the army list: a unit of the army, on the map or on the bench. */
export interface ArmyEntry {
	unit: UnitData;
	onMap: boolean;
}

/**
 * The army list - Radiant Dawn's preparations "Items": every unit, the benched
 * ones marked, in columns across the top of the screen with the highlighted
 * unit's pack drawn under it. Confirming a unit opens the pack menu beside
 * its pack; while a unit is looking for a trade partner, the list is titled
 * so and the highlighted unit's pack goes up on the right.
 */
export function armyMenuRequest(entries: readonly ArmyEntry[], viewport: Dimension, selectedIndex = 0, trading = false): MenuRequest {
	const box = armyBox(viewport);
	const { x, y } = box.getPosition();

	return {
		id: ARMY_MENU,
		title: trading ? i18n("prepare.partner") : i18n("prepare.items"),
		items: entries.map((entry) => entry.unit.name),
		ids: entries.map((entry) => entry.unit.id),
		values: entries.map((entry) => (entry.onMap ? "" : i18n("prepare.bench"))),
		width: box.getWidth(),
		height: box.getHeight(),
		columns: armyColumns(viewport),
		raised: true,
		selectedIndex,
		keepOpen: true,
		position: { x, y }
	};
}

/** Whether the unit carries a weapon its class can wield - something "Equip" could ready. */
export function canEquipAny(unit: UnitData): boolean {
	return unit.inventory.some((entry) => entry.kind === InventoryKind.WEAPON && entry.equippable);
}

/** Whether the unit carries something "Use" could use on it right now. */
export function canUseAny(unit: UnitData): boolean {
	return unit.inventory.some((entry) => UnitComponent.canUseItem(unit, entry));
}

/**
 * The pack menu, beside the unit's pack: the convoy, a trade with another
 * unit, readying a weapon, using an item. Every row is always there; one the
 * unit has nothing for is greyed out, and the flow does nothing with it.
 */
export function packMenuRequest(unit: UnitData, partners: number, convoyCount: number, viewport: Dimension, selectedIndex = 0): MenuRequest {
	return {
		id: PACK_MENU,
		title: unit.name,
		items: [i18n("prepare.convoy", { count: convoyCount }), i18n("menu.trade"), i18n("menu.equip"), i18n("menu.use")],
		ids: [...PACK_ROWS],
		disabled: [false, partners === 0, !canEquipAny(unit), !canUseAny(unit)],
		width: PACK_MENU_WIDTH,
		selectedIndex,
		position: packMenuPosition(viewport)
	};
}

/**
 * The pack as a menu in the pack panel's place, for choosing an entry: the
 * readied weapon badged, every entry's charges beside it, and the entries
 * `disabled` says nothing can be done with greyed out.
 */
function packChoiceRequest(id: string, unit: UnitData, disabled: boolean[], viewport: Dimension, selectedIndex: number): MenuRequest {
	const box = packBox(viewport);
	const { x, y } = box.getPosition();

	return {
		id,
		title: unit.name,
		items: unit.inventory.map((entry) => entry.name),
		ids: unit.inventory.map((entry) => entry.id),
		badges: unit.inventory.map((entry) => (entry.equipped ? i18n("menu.equipped") : "")),
		values: unit.inventory.map((entry) => `${entry.uses}/${entry.maxUses}`),
		disabled,
		width: box.getWidth(),
		height: box.getHeight(),
		selectedIndex,
		position: { x, y }
	};
}

/** The pack, for choosing the weapon to ready: anything the class cannot wield is greyed out. */
export function equipMenuRequest(unit: UnitData, viewport: Dimension, selectedIndex = 0): MenuRequest {
	return packChoiceRequest(
		EQUIP_MENU,
		unit,
		unit.inventory.map((entry) => entry.kind !== InventoryKind.WEAPON || !entry.equippable),
		viewport,
		selectedIndex
	);
}

/** The pack, for choosing the item to use: anything that would do nothing right now is greyed out. */
export function useMenuRequest(unit: UnitData, viewport: Dimension, selectedIndex = 0): MenuRequest {
	return packChoiceRequest(
		USE_MENU,
		unit,
		unit.inventory.map((entry) => !UnitComponent.canUseItem(unit, entry)),
		viewport,
		selectedIndex
	);
}

export const PrepareOverlayTheme = {
	/** Wash over every deploy tile while the screen is up. */
	slot: Color.hex("#7fb2ff40"),
	/** The tile of the unit picked up in formation. */
	picked: Color.hex("#ffe07a80"),
	/** Keyline around each deploy tile. */
	edge: Color.hex("#cfe0ff99")
} as const;
