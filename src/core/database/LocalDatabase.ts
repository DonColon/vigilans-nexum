/* eslint-disable @typescript-eslint/no-explicit-any */

import { GameError } from "core/GameError";
import { Repository, RepositorySettings } from "./Repository";
import { StoreNames } from "./DatabaseSchema";
import { GameCoreService } from "../service/GameCoreService";
import { promisifyTransaction } from "./PromiseUtils";

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
				this.initializeDatabase();
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

	public async transaction<T>(
		stores: StoreNames[],
		mode: TransactionMode,
		callback: (repos: RepositoryAccessor) => Promise<T>
	): Promise<T> {
		const tx = this.database.transaction(stores, mode);
		const accessor = this.createRepositoryAccessor(stores, tx);

		try {
			const result = await callback(accessor);
			await promisifyTransaction(tx);
			return result;
		} catch (error) {
			tx.abort();
			throw new GameError(`Transaction failed: ${(error as Error).message}`);
		} finally {
			this.clearTransactions(stores);
		}
	}

	private initializeDatabase(): void {
		this.createMissingStores();
		this.removeUnknownStores();
	}

	private createMissingStores(): void {
		for (const [name, settings] of Object.entries(this.config.repositories)) {
			if (!this.database.objectStoreNames.contains(name)) {
				this.database.createObjectStore(name, settings);
			}
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
			accessor[storeName] = repo;
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
