import { i18n } from "@/core/i18n/I18n";
import { PopupRequest } from "@/game/ui/states/PopupState";
import { catalogName } from "@/game/units/content/UnitCatalog";
import { Chest } from "@/game/locks/content/Locks";

/**
 * The notice shown after a chest is opened - Fire Emblem's "you got an item"
 * box, the same one a village gift gets. It names the unit and what it now
 * carries, and, when the pack was full, what had to go to the convoy for it.
 * A bare chest says so rather than showing an empty box.
 */
export function chestPopup(chest: Chest, unitName: string, itemId: string, storedId: string): PopupRequest {
	const lines: string[] = [];

	if (itemId.length === 0) {
		lines.push(i18n("chest.empty"));
	} else if (storedId !== itemId) {
		// The find itself went to the convoy: the unit never carried it, so saying
		// it "received" anything would be a lie. The one line covers it.
		lines.push(i18n("chest.received", { unit: unitName, item: catalogName(itemId) }));
	}

	if (storedId.length > 0) {
		lines.push(i18n("chest.stored", { item: catalogName(storedId) }));
	}

	return { id: `chest-${chest.id}`, title: i18n("chest.obtained"), lines };
}
