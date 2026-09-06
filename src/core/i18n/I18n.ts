import { interpolate, LocaleMessages, LocaleParams, parseLocaleFile, RawLocaleCatalog } from "@/core/i18n/Locale";
import { loadLocaleCatalog } from "@/core/i18n/LocaleCatalog";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";

/** Used when nothing better can be worked out from the browser or the options. */
export const DEFAULT_LOCALE = "en";

export interface I18nOptions {
	/**
	 * The locale files to use. Defaults to the shipped `src/game/i18n/*.json`
	 * files; pass your own for tests.
	 */
	catalog?: RawLocaleCatalog;
	/** Force a locale instead of reading it from the browser. */
	locale?: string;
	/** Locale to pull a key from when the active locale has no text for it. */
	fallbackLocale?: string;
}

/**
 * Picks the best available locale from the browser's language preferences.
 * `navigator.languages` is tried in order; for each entry an exact match wins
 * (`pt-BR`), then a match on the primary subtag (`pt-BR` -> `pt`). Falls back to
 * `fallback` when nothing lines up, or when there is no `navigator` at all.
 */
export function detectLocale(available: string[], fallback: string): string {
	const preferences = readBrowserLanguages();
	const lookup = new Map(available.map((locale) => [locale.toLowerCase(), locale]));

	for (const preference of preferences) {
		const wanted = preference.toLowerCase();

		const exact = lookup.get(wanted);
		if (exact !== undefined) {
			return exact;
		}

		const primary = wanted.split("-")[0];
		for (const locale of available) {
			if (locale.toLowerCase().split("-")[0] === primary) {
				return locale;
			}
		}
	}

	return fallback;
}

function readBrowserLanguages(): string[] {
	if (typeof navigator === "undefined") {
		return [];
	}

	if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
		return [...navigator.languages];
	}

	return navigator.language ? [navigator.language] : [];
}

/**
 * Holds the parsed locale catalog and the active locale, and resolves technical
 * keys to display text.
 *
 * A `GameCoreService`: `Game` builds one from `GameConfiguration.i18n` and it
 * registers itself. Inject it with `@GameCoreService(I18nService)` inside a
 * system or feature; from a plain module use the {@link i18n} function.
 */
@GameCoreService()
export class I18nService {
	private catalog: Record<string, LocaleMessages> = {};
	private available: string[] = [];
	private activeLocale: string = DEFAULT_LOCALE;
	private fallbackLocale: string = DEFAULT_LOCALE;

	/**
	 * Reads the browser language and loads the matching locale file. With no
	 * options the shipped `src/game/i18n/*.json` files are used and `en` is the
	 * fallback - see {@link I18nOptions} to force a locale or change the fallback.
	 */
	constructor(options: I18nOptions = {}) {
		this.configure(options);
	}

	/** Reloads the catalog and re-picks the active locale. */
	public configure(options: I18nOptions = {}): this {
		const rawCatalog = options.catalog ?? loadLocaleCatalog();

		this.catalog = {};
		for (const [locale, raw] of Object.entries(rawCatalog)) {
			this.catalog[locale] = parseLocaleFile(locale, raw);
		}

		this.available = Object.keys(this.catalog).sort();
		this.fallbackLocale = this.resolveFallback(options.fallbackLocale);
		this.setLocale(options.locale ?? detectLocale(this.available, this.fallbackLocale));

		return this;
	}

	private resolveFallback(requested?: string): string {
		if (requested !== undefined && this.catalog[requested] !== undefined) {
			return requested;
		}

		if (this.catalog[DEFAULT_LOCALE] !== undefined) {
			return DEFAULT_LOCALE;
		}

		return this.available[0] ?? DEFAULT_LOCALE;
	}

	/** Switches the active locale. An unknown locale is ignored and the current one kept. */
	public setLocale(locale: string): this {
		if (this.catalog[locale] !== undefined) {
			this.activeLocale = locale;
		}

		return this;
	}

	public getLocale(): string {
		return this.activeLocale;
	}

	public getFallbackLocale(): string {
		return this.fallbackLocale;
	}

	public getAvailableLocales(): string[] {
		return [...this.available];
	}

	/**
	 * Resolves `key` to text in the active locale, filling any `{placeholder}`
	 * from `params`. Falls back to the fallback locale, then to `key` itself so a
	 * missing translation is visible rather than blank.
	 */
	public translate(key: string, params?: LocaleParams): string {
		const template = this.catalog[this.activeLocale]?.[key] ?? this.catalog[this.fallbackLocale]?.[key] ?? key;

		return interpolate(template, params);
	}

	/** Whether the active locale defines `key` (before any fallback). */
	public has(key: string): boolean {
		return this.catalog[this.activeLocale]?.[key] !== undefined;
	}
}

/**
 * The `I18nService` `Game` registered. When no `Game` was built - a unit test, a
 * story - a browser-language default is stood up on first use so `i18n()` still
 * works with zero setup.
 */
function getI18n(): I18nService {
	if (!ServiceRegistry.has(I18nService)) {
		new I18nService();
	}

	return ServiceRegistry.get(I18nService);
}

/**
 * Resolves a technical key to display text in the active locale, filling any
 * `{placeholder}` from `params`. A thin delegate to the registered
 * {@link I18nService} - use it from plain modules where injection is not available.
 *
 * ```ts
 * i18n("menu.wait");                          // "Warten"
 * i18n("terrain.inspect", { column: 3, row: 5, terrain: "Wald", cost: 2 });
 * ```
 */
export function i18n(key: string, params?: LocaleParams): string {
	return getI18n().translate(key, params);
}
