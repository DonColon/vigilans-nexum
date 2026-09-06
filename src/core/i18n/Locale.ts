import { GameError } from "@/core/GameError";

/**
 * Values you can pass for the `{placeholder}` slots in a localised string.
 * Numbers are stringified with the default locale-independent `String()` so a
 * translated template stays predictable across environments.
 */
export type LocaleParams = Record<string, string | number>;

/** A parsed locale file: a flat map of technical key to display text. */
export type LocaleMessages = Record<string, string>;

/** A locale file as it sits on disk, keyed by locale code (`de`, `en`, ...). */
export type RawLocaleCatalog = Record<string, string>;

/** Placeholders look like `{name}` - letters, digits and underscore. */
const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fills the `{placeholder}` slots of a template from `params`. A slot with no
 * matching parameter is left untouched (`"{count}"` stays `"{count}"`) so a
 * missing value is obvious in the UI rather than silently blank.
 */
export function interpolate(template: string, params?: LocaleParams): string {
	if (params === undefined) {
		return template;
	}

	return template.replace(PLACEHOLDER, (match, name: string) => {
		if (Object.prototype.hasOwnProperty.call(params, name)) {
			return String(params[name]);
		}

		return match;
	});
}

/** The technical names a template refers to, e.g. `["column", "row"]`. */
export function placeholderNames(template: string): string[] {
	const names: string[] = [];

	for (const match of template.matchAll(PLACEHOLDER)) {
		names.push(match[1]);
	}

	return names;
}

/**
 * Parses one locale file into a key/text map. A locale file must be a JSON
 * object whose every value is a string - nested groups and non-string values
 * are rejected so `i18n()` always has a plain template to hand back.
 */
export function parseLocaleFile(locale: string, raw: string): LocaleMessages {
	let data: unknown;

	try {
		data = JSON.parse(raw);
	} catch (error) {
		throw new GameError(`Locale file "${locale}.json" is not valid JSON: ${(error as Error).message}`);
	}

	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		throw new GameError(`Locale file "${locale}.json" must be a JSON object of key/text pairs`);
	}

	const messages: LocaleMessages = {};

	for (const [key, value] of Object.entries(data)) {
		if (typeof value !== "string") {
			throw new GameError(`Locale file "${locale}.json" has a non-string value for "${key}"`);
		}

		messages[key] = value;
	}

	return messages;
}

/**
 * The keys a locale file defines more than once, in sorted order. `JSON.parse`
 * silently keeps only the last of a repeated key, so the raw text is scanned
 * here instead: every string that sits directly inside the root object and is
 * followed by a colon is a key.
 */
export function findDuplicateKeys(raw: string): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const key of topLevelKeys(raw)) {
		if (seen.has(key)) {
			duplicates.add(key);
		} else {
			seen.add(key);
		}
	}

	return [...duplicates].sort();
}

function topLevelKeys(raw: string): string[] {
	const keys: string[] = [];
	let depth = 0;
	let index = 0;

	while (index < raw.length) {
		const char = raw[index];

		if (char === '"') {
			const [literal, next] = readStringLiteral(raw, index);
			index = next;

			// A key is a string one level deep - inside the root object, not inside
			// a nested value - that a colon comes right after.
			if (depth === 1 && raw[skipWhitespace(raw, index)] === ":") {
				keys.push(JSON.parse(literal) as string);
			}

			continue;
		}

		if (char === "{" || char === "[") {
			depth++;
		} else if (char === "}" || char === "]") {
			depth--;
		}

		index++;
	}

	return keys;
}

/** Reads a JSON string starting at the opening quote; returns the literal (quotes included) and the index just past the closing quote. */
function readStringLiteral(raw: string, start: number): [string, number] {
	let index = start + 1;

	while (index < raw.length) {
		const char = raw[index];

		if (char === "\\") {
			index += 2;
			continue;
		}

		index++;

		if (char === '"') {
			break;
		}
	}

	return [raw.slice(start, index), index];
}

function skipWhitespace(raw: string, start: number): number {
	let index = start;

	while (index < raw.length) {
		const char = raw[index];

		if (char !== " " && char !== "\t" && char !== "\n" && char !== "\r") {
			break;
		}

		index++;
	}

	return index;
}
