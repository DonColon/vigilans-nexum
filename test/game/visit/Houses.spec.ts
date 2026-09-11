import { test, expect, suite } from "vitest";
import { DialogSide } from "@/game/ui/model/UILayout";
import { houseAt, houseDialog, HousesDocument, parseHouses } from "@/game/visit/model/Houses";
import skirmishHouses from "@/assets/data/houses/skirmish.houses.json";

/**
 * The house sheet: what a scenario is allowed to author, what it is rejected
 * for, and how a villager's script becomes a textbox.
 */
suite("Houses Test Suite", () => {
	const page = () => ({ speaker: { de: "Alte Frau", en: "Old Woman" }, text: { de: "Guten Tag.", en: "Good day." } });

	const sheet = (houses: unknown[]): HousesDocument => ({ format: "vigilans-houses", version: 1, houses }) as HousesDocument;
	const house = (overrides: Record<string, unknown> = {}) => ({ id: "cottage", column: 3, row: 4, openDoor: 447, pages: [page()], ...overrides });

	suite("Parsing", () => {
		test("The shipped skirmish sheet reads, and every house names a tile and an open door", () => {
			const houses = parseHouses(skirmishHouses as HousesDocument);

			expect(houses.length).toBeGreaterThan(0);

			for (const entry of houses) {
				expect(entry.id.length).toBeGreaterThan(0);
				expect(entry.openDoor).toBeGreaterThanOrEqual(0);
				expect(entry.pages.length).toBeGreaterThan(0);
			}
		});

		test("A house with no reward carries an empty one rather than an absent key", () => {
			const [parsed] = parseHouses(sheet([house()]));

			expect(parsed.reward).toBe("");
		});

		test("Pages are copied, so editing the parsed house cannot reach back into the document", () => {
			const document = sheet([house()]);
			const [parsed] = parseHouses(document);

			parsed.pages[0].text.en = "changed";

			expect(document.houses[0].pages[0].text.en).toBe("Good day.");
		});

		test("A sheet with the wrong format or version is refused", () => {
			expect(() => parseHouses({ ...sheet([house()]), format: "vigilans-conversations" } as unknown as HousesDocument)).toThrow(/format/);
			expect(() => parseHouses({ ...sheet([house()]), version: 2 } as unknown as HousesDocument)).toThrow(/version 2/);
		});

		test("Two houses cannot share an id or a doorstep", () => {
			expect(() => parseHouses(sheet([house(), house({ column: 9 })]))).toThrow(/defined twice/);
			expect(() => parseHouses(sheet([house(), house({ id: "other" })]))).toThrow(/another house already claims/);
		});

		test("A house off the tile grid, without an open door or without a script is refused", () => {
			expect(() => parseHouses(sheet([house({ column: -1 })]))).toThrow(/not a tile coordinate/);
			expect(() => parseHouses(sheet([house({ row: 1.5 })]))).toThrow(/not a tile coordinate/);
			expect(() => parseHouses(sheet([house({ openDoor: undefined })]))).toThrow(/open door/);
			expect(() => parseHouses(sheet([house({ pages: [] })]))).toThrow(/no pages/);
		});

		test("A page missing its speaker or its text is refused", () => {
			expect(() => parseHouses(sheet([house({ pages: [{ text: page().text }] })]))).toThrow(/missing its speaker/);
			expect(() => parseHouses(sheet([house({ pages: [{ speaker: page().speaker, text: {} }] })]))).toThrow(/no text in any locale/);
		});
	});

	suite("Lookups", () => {
		test("A house is found by the tile its door stands on", () => {
			const houses = parseHouses(sheet([house(), house({ id: "hut", column: 9, row: 2 })]));

			expect(houseAt(houses, 3, 4)?.id).toBe("cottage");
			expect(houseAt(houses, 9, 2)?.id).toBe("hut");
			expect(houseAt(houses, 4, 3)).toBeNull();
		});
	});

	suite("The textbox", () => {
		test("One page per page, in the active locale, all along the bottom", () => {
			const [parsed] = parseHouses(sheet([house({ pages: [page(), page()] })]));
			const dialog = houseDialog(parsed, "en", "de");

			expect(dialog.id).toBe("visit-cottage");
			expect(dialog.pages).toStrictEqual(["Good day.", "Good day."]);
			expect(dialog.speakers).toStrictEqual(["Old Woman", "Old Woman"]);
			// A villager speaks from indoors to the unit on the doorstep - there is no
			// second voice to hand the top of the screen to.
			expect(dialog.sides).toStrictEqual([DialogSide.BOTTOM, DialogSide.BOTTOM]);
		});

		test("A locale the page was not written in falls back, and then to whatever it has", () => {
			const [parsed] = parseHouses(sheet([house()]));

			expect(houseDialog(parsed, "de", "en").pages).toStrictEqual(["Guten Tag."]);
			expect(houseDialog(parsed, "fr", "de").pages).toStrictEqual(["Guten Tag."]);
			expect(houseDialog(parsed, "fr", "es").pages).toStrictEqual(["Guten Tag."]);
			expect(houseDialog(parsed, "fr", "es").speakers).toStrictEqual(["Alte Frau"]);
		});
	});
});
