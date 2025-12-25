import { Savegame } from "core/model/Savegame";

/**
 * Utility type that converts object keys to their literal types,
 * excluding string and number index signatures.
 */
type LiteralKeysOnly<T> = {
	[K in keyof T]: string extends K ? never : number extends K ? never : K;
};

/**
 * Extracts all value types from an object type.
 */
type ValueTypes<T> = T[keyof T];

/**
 * Extracts literal keys from a type.
 */
type LiteralKeys<T> = ValueTypes<LiteralKeysOnly<T>>;

/**
 * Represents the composite key structure for a database store.
 */
interface StoreKey {
	[name: string]: IDBValidKey;
}

/**
 * Defines the structure of a database store.
 */
interface StoreDefinition {
	key: StoreKey;
	type: unknown;
}

/**
 * Base schema interface for IndexedDB databases.
 */
interface DatabaseSchema {
	[storeName: string]: StoreDefinition;
}

/**
 * Application-specific database schema.
 */
export interface LocalDatabaseSchema extends DatabaseSchema {
	savegames: {
		key: {
			id: number;
		};
		type: Savegame;
	};
}

// Type helpers for working with stores
export type StoreNames = LiteralKeys<LocalDatabaseSchema>;
export type StoreType<Name extends StoreNames> = LocalDatabaseSchema[Name]["type"];
export type StoreProperties<Name extends StoreNames> = LiteralKeys<StoreType<Name>>;
