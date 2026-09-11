import { i18n } from "@/core/i18n/I18n";
import { InventoryEntry } from "@/game/units/model/UnitData";
import { MenuRequest } from "@/game/ui/states/MenuState";

/** Menu id, echoed by the `ui:menu*` events. */
export const STAFF_MENU = "unit-staff";

/** As wide as the items panel: a staff row is a name and its charges, the same as a pack row. */
export const STAFF_MENU_WIDTH = 300;

/**
 * The staves a unit could raise, Fire Emblem's staff list: one row per staff
 * in the pack, charges right-aligned, and a staff with nobody in reach of it
 * greyed out rather than left off - so the player can see they carry it and
 * why it is no use from here. The rows report the staff's catalog id.
 */
export function staffRequest(staves: readonly InventoryEntry[], reachable: readonly boolean[], anchor: { x: number; y: number }): MenuRequest {
	return {
		id: STAFF_MENU,
		title: i18n("menu.staff"),
		items: staves.map((entry) => entry.name),
		ids: staves.map((entry) => entry.id),
		values: staves.map((entry) => `${entry.uses}/${entry.maxUses}`),
		disabled: staves.map((_, index) => !(reachable[index] ?? false)),
		width: STAFF_MENU_WIDTH,
		anchor
	};
}
