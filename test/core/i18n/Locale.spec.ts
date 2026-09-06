import { test, expect, suite } from "vitest";
import { GameError } from "@/core/GameError";
import { findDuplicateKeys, interpolate, parseLocaleFile, placeholderNames } from "@/core/i18n/Locale";

suite("Locale File Test Suite", () => {
	test("Placeholders are filled from the parameters", () => {
		expect(interpolate("Tile {column}, {row}", { column: 3, row: 5 })).toBe("Tile 3, 5");
	});

	test("A placeholder with no parameter is left untouched", () => {
		expect(interpolate("{name}: {current}/{max} HP", { name: "Dardan" })).toBe("Dardan: {current}/{max} HP");
	});

	test("A template with no parameters is returned as-is", () => {
		expect(interpolate("Wait")).toBe("Wait");
		expect(interpolate("Turn {turn}")).toBe("Turn {turn}");
	});

	test("Placeholder names are read out in order", () => {
		expect(placeholderNames("Tile {column}, {row} - {terrain}")).toStrictEqual(["column", "row", "terrain"]);
		expect(placeholderNames("no slots here")).toStrictEqual([]);
	});

	test("A flat object of string values parses into a message map", () => {
		expect(parseLocaleFile("en", '{ "menu.wait": "Wait", "menu.back": "Back" }')).toStrictEqual({
			"menu.wait": "Wait",
			"menu.back": "Back"
		});
	});

	test("Invalid JSON, arrays and non-string values are rejected", () => {
		expect(() => parseLocaleFile("en", "{ not json")).toThrowError(GameError);
		expect(() => parseLocaleFile("en", '["a", "b"]')).toThrowError(GameError);
		expect(() => parseLocaleFile("en", '{ "count": 3 }')).toThrowError(GameError);
		expect(() => parseLocaleFile("en", '{ "group": { "nested": "x" } }')).toThrowError(GameError);
	});

	test("Repeated keys are found in the raw text even though JSON.parse hides them", () => {
		const raw = '{ "menu.wait": "Wait", "menu.back": "Back", "menu.wait": "Hold" }';

		expect(JSON.parse(raw)["menu.wait"]).toBe("Hold");
		expect(findDuplicateKeys(raw)).toStrictEqual(["menu.wait"]);
	});

	test("A colon inside a value is not mistaken for a key", () => {
		const raw = '{ "time": "12:00", "note": "key: value" }';
		expect(findDuplicateKeys(raw)).toStrictEqual([]);
	});

	test("A clean file reports no duplicates", () => {
		expect(findDuplicateKeys('{ "a": "1", "b": "2", "c": "3" }')).toStrictEqual([]);
	});
});
