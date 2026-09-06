import { GameError } from "@/core/GameError";
import { findDuplicateKeys, parseLocaleFile, RawLocaleCatalog } from "@/core/i18n/Locale";

export type LocaleIssueKind = "empty-catalog" | "invalid-file" | "duplicate-key" | "missing-key";

export interface LocaleValidationIssue {
	/** The locale the issue belongs to, or `*` for a catalog-wide problem. */
	locale: string;
	kind: LocaleIssueKind;
	message: string;
	/** The offending keys, for `duplicate-key` and `missing-key`. */
	keys?: string[];
}

export interface LocaleValidationResult {
	valid: boolean;
	issues: LocaleValidationIssue[];
}

/**
 * Checks a locale catalog for the two mistakes that break translations at
 * runtime:
 *
 *  - a key defined more than once in the same file (only one wins, unpredictably)
 *  - a key present in some files but missing from others (a language falls back
 *    or shows the raw key)
 *
 * The contract each file must meet is the union of every key seen in any
 * readable file, so adding a key to one language flags it as missing everywhere
 * else. Files that are not valid JSON, or that carry a non-string value, are
 * reported and left out of the key comparison.
 */
export function validateLocaleCatalog(catalog: RawLocaleCatalog): LocaleValidationResult {
	const locales = Object.keys(catalog).sort();

	if (locales.length === 0) {
		return {
			valid: false,
			issues: [{ locale: "*", kind: "empty-catalog", message: "No locale files were found - expected at least one src/game/i18n/[locale].json" }]
		};
	}

	const issues: LocaleValidationIssue[] = [];
	const keysByLocale = new Map<string, Set<string>>();

	for (const locale of locales) {
		const raw = catalog[locale];

		let messages;
		try {
			messages = parseLocaleFile(locale, raw);
		} catch (error) {
			issues.push({ locale, kind: "invalid-file", message: (error as Error).message });
			continue;
		}

		const duplicates = findDuplicateKeys(raw);
		if (duplicates.length > 0) {
			issues.push({
				locale,
				kind: "duplicate-key",
				message: `Locale "${locale}" defines ${duplicates.length} key(s) more than once: ${duplicates.join(", ")}`,
				keys: duplicates
			});
		}

		keysByLocale.set(locale, new Set(Object.keys(messages)));
	}

	const referenceKeys = new Set<string>();
	for (const keys of keysByLocale.values()) {
		for (const key of keys) {
			referenceKeys.add(key);
		}
	}

	for (const [locale, keys] of keysByLocale) {
		const missing = [...referenceKeys].filter((key) => !keys.has(key)).sort();

		if (missing.length > 0) {
			issues.push({
				locale,
				kind: "missing-key",
				message: `Locale "${locale}" is missing ${missing.length} key(s): ${missing.join(", ")}`,
				keys: missing
			});
		}
	}

	return { valid: issues.length === 0, issues };
}

/** Runs {@link validateLocaleCatalog} and throws a `GameError` listing every issue if the catalog is not valid. */
export function assertLocaleCatalog(catalog: RawLocaleCatalog): void {
	const result = validateLocaleCatalog(catalog);

	if (!result.valid) {
		const details = result.issues.map((issue) => `  - ${issue.message}`).join("\n");
		throw new GameError(`Locale catalog is invalid:\n${details}`);
	}
}
