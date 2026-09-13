import { i18n } from "@/core/i18n/I18n";
import { MenuRequest } from "@/game/ui/states/MenuState";
import { isUsableEntry } from "@/game/units/model/Inventory";
import { InventoryEntry } from "@/game/units/model/UnitData";

/** Menu id, echoed by the `ui:menu*` events. */
export const CONVOY_MENU = "convoy-choice";

export const CONVOY_MENU_WIDTH = 340;

/**
 * The choice a full pack forces: something has to go to the convoy, and the
 * player says what. The rows are the unit's own slots in pack order, with the
 * incoming entry last and badged as the new arrival - so "send the thing I was
 * just given" is a row like any other, and it is the one the cursor starts on.
 *
 * Picking the incoming row leaves the pack exactly as it was, which is why
 * backing out of the menu does the same thing: a cancel here cannot mean "don't
 * take the item", because the villager has already handed it over.
 */
export function convoyChoiceRequest(carried: readonly InventoryEntry[], incoming: InventoryEntry): MenuRequest {
	const rows = [...carried, incoming];
	const newest = rows.length - 1;

	return {
		id: CONVOY_MENU,
		title: i18n("convoy.title"),
		items: rows.map((entry) => entry.name),
		ids: rows.map((entry) => entry.id),
		badges: rows.map((_, index) => (index === newest ? i18n("convoy.new") : "")),
		values: rows.map((entry) => `${entry.uses}/${entry.maxUses}`),
		disabled: rows.map((entry) => !isUsableEntry(entry)),
		width: CONVOY_MENU_WIDTH,
		selectedIndex: newest
	};
}

/**
 * Which row of that menu the player chose, as an index into the unit's pack -
 * or `-1` for the incoming entry, which is its own answer: nothing in the pack
 * changes hands. Anything out of range is read as the incoming entry too, so a
 * stray id can only ever leave the pack alone.
 */
export function convoyChoiceSlot(index: number, packSize: number): number {
	return Number.isInteger(index) && index >= 0 && index < packSize ? index : -1;
}
