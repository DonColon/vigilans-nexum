import { GameError } from "@/core/GameError";
import { Repository, RepositorySettings } from "@/core/database/Repository";
import { StoreNames } from "@/core/database/DatabaseSchema";
import { GameCoreService } from "@/core/service/GameCoreService";
import { promisifyTransaction } from "@/core/database/PromiseUtils";

export interface DatabaseConfiguration {
	version: number;
	repositories: {
		[Name in StoreNames]: RepositorySettings;
	};
}

export type TransactionMode = "readonly" | "readwrite";

export type RepositoryAccessor = {
	[K in StoreNames]: Repository<K>;
};

@GameCoreService()
export class LocalDatabase {
	private readonly repositories = new Map<StoreNames, Repository<any>>();
	private database!: IDBDatabase;

	constructor(
		private readonly id: string,
		private readonly config: DatabaseConfiguration
	) {}

	public async connect(): Promise<void> {
		const request = indexedDB.open(this.id, this.config.version);

		return new Promise<void>((resolve, reject) => {
			request.onupgradeneeded = () => {
				this.database = request.result;
				// The upgrade transaction is the only way to look at a store that
				// already exists - its key path decides whether it is kept.
				this.initializeDatabase(request.transaction);
			};

			request.onsuccess = () => {
				this.database = request.result;
				this.loadRepositories();
				resolve();
			};

			request.onerror = () => reject(request.error);
		});
	}

	public disconnect(): void {
		this.database.close();
	}

	public getRepository<Name extends StoreNames>(name: Name): Repository<Name> {
		const repository = this.repositories.get(name);

		if (!repository) {
			throw new GameError(`Repository ${name} does not exist`);
		}

		return repository;
	}

	public async transaction<T>(stores: StoreNames[], mode: TransactionMode, callback: (repos: RepositoryAccessor) => Promise<T>): Promise<T> {
		const tx = this.database.transaction(stores, mode);
		const accessor = this.createRepositoryAccessor(stores, tx);

		try {
			const result = await callback(accessor);

			await promisifyTransaction(tx);

			return result;
		} catch (error) {
			tx.abort();
			throw new GameError(`Transaction failed: ${error}`);
		} finally {
			this.clearTransactions(stores);
		}
	}

	private initializeDatabase(upgrade: IDBTransaction | null): void {
		this.createMissingStores(upgrade);
		this.removeUnknownStores();
	}

	/**
	 * Creates every configured store that is missing. A store that already
	 * exists but was created with a different key path is dropped and made
	 * again: the key path is fixed at creation, so an upgrade is the only place
	 * it can change, and a store whose key is not the one its settings name
	 * cannot take a write.
	 */
	private createMissingStores(upgrade: IDBTransaction | null): void {
		for (const [name, settings] of Object.entries(this.config.repositories)) {
			if (this.database.objectStoreNames.contains(name)) {
				const keyPath = upgrade?.objectStore(name).keyPath ?? null;

				if (sameKeyPath(keyPath, settings.key ?? null)) {
					continue;
				}

				this.database.deleteObjectStore(name);
			}

			// The settings call the key `key`; IndexedDB calls it `keyPath`.
			this.database.createObjectStore(name, { keyPath: settings.key, autoIncrement: settings.autoIncrement });
		}
	}

	private removeUnknownStores(): void {
		for (const name of this.database.objectStoreNames) {
			if (!this.isValidStoreName(name)) {
				this.database.deleteObjectStore(name);
			}
		}
	}

	private loadRepositories(): void {
		for (const name of Object.keys(this.config.repositories)) {
			if (this.database.objectStoreNames.contains(name)) {
				const storeName = name as StoreNames;
				this.repositories.set(storeName, new Repository(storeName, this.database));
			}
		}
	}

	private createRepositoryAccessor(stores: StoreNames[], tx: IDBTransaction): RepositoryAccessor {
		const accessor = {} as RepositoryAccessor;

		for (const storeName of stores) {
			const repo = this.getRepository(storeName);
			repo.setTransaction(tx);
			// Assigned through Object.assign: indexing the mapped type with a union of
			// store names narrows the value to never once there is more than one store.
			Object.assign(accessor, { [storeName]: repo });
		}

		return accessor;
	}

	private clearTransactions(stores: StoreNames[]): void {
		for (const storeName of stores) {
			this.getRepository(storeName).clearTransaction();
		}
	}

	private isValidStoreName(name: string): boolean {
		return name in this.config.repositories;
	}
}

/** Whether a store's key path is the one its settings name. */
function sameKeyPath(actual: string | string[] | null, expected: string | string[] | null): boolean {
	if (actual === null || expected === null) {
		return actual === expected;
	}

	return JSON.stringify(actual) === JSON.stringify(expected);
}
