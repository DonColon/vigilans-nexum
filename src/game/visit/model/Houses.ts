import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { i18n } from "@/core/i18n/I18n";
import { LocalizedText, localizedText } from "@/core/i18n/LocalizedText";
import { DialogRequest } from "@/game/ui/states/DialogState";
import { catalogName } from "@/game/units/model/UnitCatalog";
import { PopupRequest } from "@/game/ui/states/PopupState";
import { DialogSide } from "@/game/ui/model/UILayout";

/**
 * The houses on a battle map whose door a unit can knock on - Fire Emblem's
 * "Visit". They are authored per scenario in
 * `src/assets/data/houses/*.houses.json` and shipped as JSON assets, so who
 * lives where, what they say and what they hand over is content, the same way
 * the conversations and the unit sheets are.
 *
 * A house names the tile its door stands on, the frame that door shows while
 * there is still someone in to talk to, and its pages of script. The *closed*
 * door is whatever the map already draws there, so the map stays the one place
 * that says what a shut door looks like; only the open one has to be named
 * here, because a shut door on its own cannot say which doorway it opens into.
 */

/** One page of script: a villager with no unit sheet, so the name is authored per locale too. */
export interface HousePageDocument extends JsonSchema {
	speaker: LocalizedText;
	text: LocalizedText;
}

// The on-disk shape, like UnitDocument: fields may be left out here, and only
// the validated [[House]] below is stored on a component.
export interface HouseDocument {
	id: string;
	/** Tile the door stands on - a unit knocks from a tile next to this one. */
	column: number;
	row: number;
	/** Frame the door shows while the house has not been visited yet. */
	openDoor: number;
	/** Catalog id of the weapon or item handed over. Left out for a house that only has words. */
	reward?: string;
	pages: HousePageDocument[];
}

/** An on-disk house sheet, one per scenario. */
export interface HousesDocument {
	format: "vigilans-houses";
	version: 1;
	houses: HouseDocument[];
}

/** A validated house - the shape [[VisitComponent]] stores. */
export interface House extends JsonSchema {
	id: string;
	column: number;
	row: number;
	openDoor: number;
	/** Catalog id of the gift, or `""` when the house only has words. */
	reward: string;
	pages: HousePageDocument[];
}

function assertTile(value: unknown, where: string): number {
	if (!Number.isInteger(value) || (value as number) < 0) {
		throw new GameError(`${where} is not a tile coordinate`);
	}

	return value as number;
}

/**
 * Turns a parsed `*.houses.json` document into the houses the visit feature
 * works with, rejecting the mistakes that would only show up as a door that
 * never opens: a house off the tile grid, one with nothing to say, a page
 * missing its speaker or its text.
 */
export function parseHouses(document: HousesDocument): House[] {
	if (document.format !== "vigilans-houses") {
		throw new GameError(`House sheet has format "${document.format}", expected "vigilans-houses"`);
	}

	if (document.version !== 1) {
		throw new GameError(`House sheet has version ${document.version}, this build reads version 1`);
	}

	if (!Array.isArray(document.houses)) {
		throw new GameError("House sheet is missing its houses");
	}

	const seen = new Set<string>();
	const tiles = new Set<string>();

	return document.houses.map((house) => {
		if (typeof house.id !== "string" || house.id.length === 0) {
			throw new GameError("A house is missing its id");
		}

		if (seen.has(house.id)) {
			throw new GameError(`House "${house.id}" is defined twice`);
		}

		seen.add(house.id);

		const column = assertTile(house.column, `House "${house.id}" column`);
		const row = assertTile(house.row, `House "${house.id}" row`);
		const tile = `${column},${row}`;

		if (tiles.has(tile)) {
			throw new GameError(`House "${house.id}" stands on tile ${tile}, which another house already claims`);
		}

		tiles.add(tile);

		if (!Number.isInteger(house.openDoor) || house.openDoor < 0) {
			throw new GameError(`House "${house.id}" needs the frame of its open door, got ${house.openDoor}`);
		}

		if (!Array.isArray(house.pages) || house.pages.length === 0) {
			throw new GameError(`House "${house.id}" has no pages`);
		}

		for (const [index, page] of house.pages.entries()) {
			if (typeof page.speaker !== "object" || page.speaker === null || Object.keys(page.speaker).length === 0) {
				throw new GameError(`Page ${index} of house "${house.id}" is missing its speaker`);
			}

			if (typeof page.text !== "object" || page.text === null || Object.keys(page.text).length === 0) {
				throw new GameError(`Page ${index} of house "${house.id}" has no text in any locale`);
			}
		}

		return {
			id: house.id,
			column,
			row,
			openDoor: house.openDoor,
			reward: house.reward ?? "",
			pages: house.pages.map((page) => ({ speaker: { ...page.speaker }, text: { ...page.text } }))
		};
	});
}

/** The house whose door stands on this tile, or null when none does. */
export function houseAt(houses: readonly House[], column: number, row: number): House | null {
	return houses.find((house) => house.column === column && house.row === row) ?? null;
}

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
