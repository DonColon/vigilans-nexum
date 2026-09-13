import { i18n } from "@/core/i18n/I18n";
import { localizedText } from "@/core/i18n/LocalizedText";
import { DialogRequest } from "@/game/ui/states/DialogState";
import { PopupRequest } from "@/game/ui/states/PopupState";
import { DialogSide } from "@/game/ui/view/UILayout";
import { catalogName } from "@/game/units/content/UnitCatalog";
import { House } from "@/game/visit/content/Houses";

/**
 * Lays a house's script out as a textbox: one page per page, each labelled with
 * the villager's own name. The box holds the bottom of the screen throughout -
 * unlike a talk, which is two units trading ends of the screen, this is one
 * voice speaking from indoors to the unit on the doorstep.
 */
export function houseDialog(house: House, locale: string, fallbackLocale: string): DialogRequest {
	return {
		id: `visit-${house.id}`,
		pages: house.pages.map((page) => localizedText(page.text, locale, fallbackLocale)),
		speakers: house.pages.map((page) => localizedText(page.speaker, locale, fallbackLocale)),
		sides: house.pages.map(() => DialogSide.BOTTOM)
	};
}

/**
 * The notice shown after a villager hands something over - Fire Emblem's "you
 * got an item" box. It names the unit and the gift rather than describing it,
 * because what the player wants from it is which of their units is now carrying
 * what - and, when the pack was full, what had to go to the convoy for it.
 */
export function giftPopup(house: House, unitName: string, itemId: string, storedId: string): PopupRequest {
	const lines: string[] = [];

	// The gift itself went to the convoy: the unit never carried it, so saying it
	// "received" anything would be a lie. The one line covers it.
	if (storedId !== itemId) {
		lines.push(i18n("visit.received", { unit: unitName, item: catalogName(itemId) }));
	}

	if (storedId.length > 0) {
		lines.push(i18n("visit.stored", { item: catalogName(storedId) }));
	}

	return { id: `visit-gift-${house.id}`, title: i18n("visit.obtained"), lines };
}
