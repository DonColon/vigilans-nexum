import { StoreNames, StoreProperties, StoreType } from "./DatabaseSchema";
import { promisifyRequest, promisifyTransaction } from "./PromiseUtils";

export interface RepositorySettings {
    autoIncrement?: boolean;
    key?: string | string[];
}

export class Repository<Name extends StoreNames> {
    private transaction?: IDBTransaction;

    constructor(
        private name: Name,
        private database: IDBDatabase
    ) {}

    public async create(data: StoreType<Name>): Promise<IDBValidKey> {
        return this.executeStoreOperation(
            "readwrite",
            (store) => store.add(data)
        );
    }

    public async read(key: IDBValidKey): Promise<StoreType<Name>> {
        return this.executeStoreOperation(
            "readonly",
            (store) => store.get(key)
        );
    }

    public async update(data: StoreType<Name>): Promise<IDBValidKey> {
        return this.executeStoreOperation(
            "readwrite",
            (store) => store.put(data)
        );
    }

    public async delete(key: IDBValidKey): Promise<boolean> {
        const result = await this.executeStoreOperation(
            "readwrite",
            (store) => store.delete(key)
        );
        return result === undefined;
    }

    public async list(): Promise<StoreType<Name>[]> {
        return this.executeStoreOperation(
            "readonly",
            (store) => store.getAll()
        );
    }

    public async exists(data: StoreType<Name>): Promise<boolean> {
        const transaction = this.getTransaction("readonly");
        const store = transaction.objectStore(this.name);
        const key = this.extractKey(data, store);

        if (key === null) {
            return false;
        }

        const result = await this.executeStoreOperation(
            "readonly",
            (store) => store.getKey(key)
        );
        return result !== undefined;
    }

    public async save(data: StoreType<Name>): Promise<IDBValidKey> {
        const exists = await this.exists(data);
        return exists ? this.update(data) : this.create(data);
    }

    public setTransaction(tx: IDBTransaction): void {
        this.transaction = tx;
    }

    public clearTransaction(): void {
        this.transaction = undefined;
    }

    private async executeStoreOperation<T>(
        mode: IDBTransactionMode,
        operation: (store: IDBObjectStore) => IDBRequest<T>
    ): Promise<T> {
        const transaction = this.getTransaction(mode);
        const shouldWait = !this.transaction;
        const store = transaction.objectStore(this.name);
        const operationPromise = promisifyRequest(operation(store));

        if (shouldWait) {
            const done = promisifyTransaction(transaction);
            const [result] = await Promise.all([operationPromise, done]);
            return result;
        }
        
        return await operationPromise;
    }

    private extractKey(data: StoreType<Name>, store: IDBObjectStore): IDBValidKey | null {
        const keyPath = store.keyPath;

        if (Array.isArray(keyPath)) {
            const key: IDBValidKey[] = [];

            for (const path of keyPath) {
                if (!(path in data)) {
                    return null;
                }

                const propertyName = path as StoreProperties<Name>;
                const value = data[propertyName];

                if (!this.isValidKey(value)) {
                    return null;
                }

                key.push(value as IDBValidKey);
            }

            return key;
        }

        if (keyPath === null || !(keyPath in data)) {
            return null;
        }

        const propertyName = keyPath as StoreProperties<Name>;
        const value = data[propertyName];

        return this.isValidKey(value) ? (value as IDBValidKey) : null;
    }

    private getTransaction(mode: IDBTransactionMode): IDBTransaction {
        return this.transaction || this.database.transaction(this.name, mode);
    }

    private isValidKey(key: unknown): key is IDBValidKey {
        return (
            typeof key === "string" ||
            typeof key === "number" ||
            key instanceof Date ||
            key instanceof ArrayBuffer ||
            (key instanceof Array && key.every((value) => typeof value === "string")) ||
            (key instanceof Array && key.every((value) => typeof value === "number")) ||
            (key instanceof Array && key.every((value) => value instanceof Date)) ||
            (key instanceof Array && key.every((value) => value instanceof ArrayBuffer))
        );
    }
}
