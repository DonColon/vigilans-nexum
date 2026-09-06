import { test, expect, suite } from "vitest";
import { assertLocaleCatalog, validateLocaleCatalog } from "@/core/i18n/LocaleValidation";
import { loadLocaleCatalog } from "@/core/i18n/LocaleCatalog";
import { I18nService } from "@/core/i18n/I18n";

/**
 * Guards the real translations: this fails CI if a key is added to one
 * `src/game/i18n/[locale].json` and not the others, or defined twice in a file.
 */
suite("Shipped Locale Catalog Test Suite", () => {
	const catalog = loadLocaleCatalog();

	test("At least two locale files ship and were globbed in", () => {
		expect(Object.keys(catalog).length).toBeGreaterThan(1);
	});

	test("Every locale file has the same keys, each defined once", () => {
		const result = validateLocaleCatalog(catalog);
		expect(result.issues).toStrictEqual([]);
		expect(result.valid).toBe(true);
	});

	test("assertLocaleCatalog accepts the shipped files", () => {
		expect(() => assertLocaleCatalog(catalog)).not.toThrow();
	});

	test("The catalog wired through the service resolves a real key with placeholders", () => {
		const i18n = new I18nService();
		i18n.configure({ catalog, locale: "en" });

		expect(i18n.translate("menu.wait")).toBe("Wait");
		expect(i18n.translate("terrain.inspect", { column: 3, row: 5, terrain: "Forest", cost: 2 })).toBe("Tile 3, 5 - Forest. Movement cost: 2.");

		i18n.setLocale("de");
		expect(i18n.translate("menu.wait")).toBe("Warten");
	});
});
