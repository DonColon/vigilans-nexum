import { RawLocaleCatalog } from "@/core/i18n/Locale";

/**
 * Every locale file, inlined by Vite at build time as raw text (raw so the
 * validation can see repeated keys, which `JSON.parse` would collapse).
 *
 * The glob is relative on purpose: the translations live in the game layer
 * (`src/game/i18n`) while the engine that reads them lives here in core, the
 * same way `asset.manifest.ts` and `game.config.ts` feed game data into core.
 * Point it somewhere else to move the files.
 */
const rawLocaleModules = import.meta.glob<string>("../../game/i18n/*.json", {
	query: "?raw",
	import: "default",
	eager: true
});

/**
 * Reads the shipped locale files into a `{ [locale]: rawJson }` map. The locale
 * code is the file's base name, so `de.json` becomes `de`.
 */
export function loadLocaleCatalog(): RawLocaleCatalog {
	const catalog: RawLocaleCatalog = {};

	for (const [path, raw] of Object.entries(rawLocaleModules)) {
		const fileName = path.slice(path.lastIndexOf("/") + 1);
		const locale = fileName.replace(/\.json$/, "");
		catalog[locale] = raw;
	}

	return catalog;
}
