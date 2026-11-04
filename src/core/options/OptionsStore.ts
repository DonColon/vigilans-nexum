/**
 * Where settings are written down between visits.
 *
 * `localStorage` rather than a database, on purpose. Settings have to be
 * readable *before the first frame* - a language or a brightness that arrives a
 * few frames late is a visible flicker from the defaults to the player's own
 * choices. `localStorage` is synchronous; IndexedDB is not, and a game that
 * connects to its database as part of starting up would read them too late.
 * Savegames are the opposite case and belong in the database.
 *
 * Everything here tolerates storage being unavailable: a browser in private
 * mode, or one with site data switched off, throws on access rather than
 * returning null. Settings that cannot be saved are not worth a crash.
 */

/** Settings as they are written down: the stored value of each, by id. */
export type StoredOptions = Record<string, string>;

function storage(): Storage | null {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

/** Reads the settings written down last time, or nothing at all when there are none or they cannot be read. */
export function loadOptions(key: string): StoredOptions {
	try {
		const raw = storage()?.getItem(key);

		if (raw === null || raw === undefined) {
			return {};
		}

		const parsed: unknown = JSON.parse(raw);

		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return {};
		}

		// Only the string entries: anything else was not written by this and is not
		// a value any setting could take.
		return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
	} catch {
		return {};
	}
}

/** Writes the settings down. Silently does nothing where storage is unavailable. */
export function saveOptions(key: string, values: StoredOptions): void {
	try {
		storage()?.setItem(key, JSON.stringify(values));
	} catch {
		// Full, blocked or private - not worth interrupting the game for.
	}
}

/** Forgets everything written down under this key - for a "restore defaults", and for tests. */
export function clearOptions(key: string): void {
	try {
		storage()?.removeItem(key);
	} catch {
		// As above.
	}
}
