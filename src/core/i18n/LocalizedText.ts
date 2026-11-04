/**
 * A single piece of authored prose in every language it has been written in,
 * keyed by locale. Content sheets carry their text this way rather than through
 * the flat `[locale].json` key tables: a conversation or a villager's line is
 * written once, with its translations side by side, so a missing one is visible
 * in the file it belongs to instead of hiding in a string table.
 */
export type LocalizedText = Record<string, string>;

/**
 * The text in `locale`, falling back to `fallbackLocale` and then to whatever
 * language it was written in at all - an untranslated line still reads, rather
 * than showing an empty box. Empty only when there is no text of any kind.
 */
export function localizedText(text: LocalizedText, locale: string, fallbackLocale: string): string {
	return text[locale] ?? text[fallbackLocale] ?? Object.values(text)[0] ?? "";
}
