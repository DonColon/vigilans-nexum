import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { detectLocale, i18n, I18nService } from "@/core/i18n/I18n";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";

const CATALOG = {
	de: '{ "menu.wait": "Warten", "turn.banner": "Zug {turn} - {faction}", "only.de": "nur Deutsch" }',
	en: '{ "menu.wait": "Wait", "turn.banner": "Turn {turn} - {faction}", "only.en": "english only" }'
};

suite("I18n Service Test Suite", () => {
	let i18n: I18nService;

	beforeEach(() => {
		i18n = new I18nService();
	});

	test("The forced locale wins over the browser", () => {
		i18n.configure({ catalog: CATALOG, locale: "de" });

		expect(i18n.getLocale()).toBe("de");
		expect(i18n.translate("menu.wait")).toBe("Warten");
	});

	test("Placeholders are filled from the parameters", () => {
		i18n.configure({ catalog: CATALOG, locale: "en" });

		expect(i18n.translate("turn.banner", { turn: 3, faction: "Player Phase" })).toBe("Turn 3 - Player Phase");
	});

	test("A missing key falls back to the fallback locale, then to the key itself", () => {
		i18n.configure({ catalog: CATALOG, locale: "en", fallbackLocale: "de" });

		expect(i18n.translate("only.de")).toBe("nur Deutsch");
		expect(i18n.translate("does.not.exist")).toBe("does.not.exist");
		expect(i18n.has("only.de")).toBe(false);
	});

	test("setLocale switches languages, an unknown locale is ignored", () => {
		i18n.configure({ catalog: CATALOG, locale: "en" });

		i18n.setLocale("de");
		expect(i18n.translate("menu.wait")).toBe("Warten");

		i18n.setLocale("fr");
		expect(i18n.getLocale()).toBe("de");
	});

	test("The fallback locale defaults to a shipped one when the request is not available", () => {
		i18n.configure({ catalog: CATALOG, locale: "de", fallbackLocale: "fr" });

		// "fr" is not in the catalog, so it falls back to the DEFAULT_LOCALE "en".
		expect(i18n.getFallbackLocale()).toBe("en");
	});

	test("Available locales are listed in sorted order", () => {
		i18n.configure({ catalog: CATALOG });
		expect(i18n.getAvailableLocales()).toStrictEqual(["de", "en"]);
	});
});

suite("Locale Detection Test Suite", () => {
	const originalLanguages = Object.getOwnPropertyDescriptor(window.navigator, "languages");

	function browserPrefers(...languages: string[]) {
		Object.defineProperty(window.navigator, "languages", { value: languages, configurable: true });
	}

	afterEach(() => {
		if (originalLanguages) {
			Object.defineProperty(window.navigator, "languages", originalLanguages);
		}
	});

	test("An exact match on a browser language is preferred", () => {
		browserPrefers("pt-BR", "en-US");
		expect(detectLocale(["en", "pt-BR"], "en")).toBe("pt-BR");
	});

	test("A primary subtag match is used when there is no exact match", () => {
		browserPrefers("de-DE", "en-US");
		expect(detectLocale(["en", "de"], "en")).toBe("de");
	});

	test("Earlier browser preferences win over later ones", () => {
		browserPrefers("fr-FR", "de-DE");
		expect(detectLocale(["de", "fr"], "de")).toBe("fr");
	});

	test("The fallback is used when nothing lines up", () => {
		browserPrefers("ja-JP");
		expect(detectLocale(["de", "en"], "en")).toBe("en");
	});
});

suite("i18n() Function Test Suite", () => {
	beforeEach(() => {
		ServiceRegistry.clear();
	});

	test("Delegates to the I18nService that Game registered", () => {
		new I18nService({ catalog: { de: '{ "greeting": "Hallo" }', en: '{ "greeting": "Hi" }' }, locale: "de" });

		expect(i18n("greeting")).toBe("Hallo");
	});

	test("Stands up a browser-language default when nothing registered one", () => {
		// jsdom's navigator asks for en-US and en.json ships, so English comes back.
		expect(i18n("menu.wait")).toBe("Wait");
		expect(ServiceRegistry.has(I18nService)).toBe(true);
	});
});
