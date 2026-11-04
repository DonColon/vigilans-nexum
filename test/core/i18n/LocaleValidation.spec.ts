import { test, expect, suite } from "vitest";
import { GameError } from "@/core/GameError";
import { assertLocaleCatalog, validateLocaleCatalog } from "@/core/i18n/LocaleValidation";

suite("Locale Validation Test Suite", () => {
	test("Matching files with the same keys are valid", () => {
		const result = validateLocaleCatalog({
			de: '{ "menu.wait": "Warten", "menu.back": "Zurück" }',
			en: '{ "menu.wait": "Wait", "menu.back": "Back" }'
		});

		expect(result.valid).toBe(true);
		expect(result.issues).toStrictEqual([]);
	});

	test("A key missing from one file is reported against that file", () => {
		const result = validateLocaleCatalog({
			de: '{ "menu.wait": "Warten", "menu.back": "Zurück" }',
			en: '{ "menu.wait": "Wait" }'
		});

		expect(result.valid).toBe(false);

		const missing = result.issues.find((issue) => issue.kind === "missing-key");
		expect(missing?.locale).toBe("en");
		expect(missing?.keys).toStrictEqual(["menu.back"]);
	});

	test("A key defined twice in a file is reported", () => {
		const result = validateLocaleCatalog({
			en: '{ "menu.wait": "Wait", "menu.wait": "Hold" }'
		});

		expect(result.valid).toBe(false);

		const duplicate = result.issues.find((issue) => issue.kind === "duplicate-key");
		expect(duplicate?.locale).toBe("en");
		expect(duplicate?.keys).toStrictEqual(["menu.wait"]);
	});

	test("An unreadable file is reported and kept out of the key comparison", () => {
		const result = validateLocaleCatalog({
			de: '{ "menu.wait": "Warten" }',
			en: "{ broken"
		});

		expect(result.valid).toBe(false);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({ locale: "en", kind: "invalid-file" });
	});

	test("An empty catalog is not valid", () => {
		const result = validateLocaleCatalog({});

		expect(result.valid).toBe(false);
		expect(result.issues[0].kind).toBe("empty-catalog");
	});

	test("assertLocaleCatalog throws a GameError listing the issues", () => {
		expect(() => assertLocaleCatalog({ de: '{ "a": "1" }', en: '{ "b": "2" }' })).toThrowError(GameError);
		expect(() => assertLocaleCatalog({ de: '{ "a": "1" }', en: '{ "a": "2" }' })).not.toThrow();
	});
});
