import { StoreNames, StoreProperties, StoreType } from "./DatabaseSchema";


export interface RepositorySettings
{
    autoIncrement?: boolean,
    key?: string | string[]
}


export class Repository<Name extends StoreNames = any>
{
    constructor(private name: Name, private database: IDBDatabase) {}


    public async create(data: StoreType<Name>): Promise<IDBValidKey>
    {
        const transaction = this.database.transaction(this.name, "readwrite");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.add(data));

        const [result, _] = await Promise.all([operation, done]);
        return result;
    }

    public async read(key: IDBValidKey): Promise<StoreType<Name>>
    {
        const transaction = this.database.transaction(this.name, "readonly");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.get(key));

        const [result, _] = await Promise.all([operation, done]);
        return result;
    }

    public async update(data: StoreType<Name>): Promise<IDBValidKey>
    {
        const transaction = this.database.transaction(this.name, "readwrite");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.put(data));

        const [result, _] = await Promise.all([operation, done]);
        return result;
    }

    public async delete(key: IDBValidKey): Promise<boolean>
    {
        const transaction = this.database.transaction(this.name, "readwrite");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.delete(key));

        const [result, _] = await Promise.all([operation, done]);
        return result === undefined;
    }

    public async list(): Promise<StoreType<Name>[]>
    {
        const transaction = this.database.transaction(this.name, "readonly");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.getAll());

       const [result, _] = await Promise.all([operation, done]);
       return result;
    }

    public async exists(data: StoreType<Name>): Promise<boolean>
    {
        const transaction = this.database.transaction(this.name, "readonly");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const key = this.extractKey(data, store);

        if(key === null) {
            return false;
        }
        
        const operation = this.promisifyRequest(store.getKey(key));

        const [result, _] = await Promise.all([operation, done]);
        return result !== undefined;
    }

    public async save(data: StoreType<Name>): Promise<IDBValidKey>
    {
        const exists = await this.exists(data);

        if(exists) {
            return this.update(data);
        } else {
            return this.create(data);
        }
    }


    private extractKey(data: StoreType<Name>, store: IDBObjectStore): IDBValidKey | null
    {
        const keyPath = store.keyPath;

        if(Array.isArray(keyPath)) {
            const key: IDBValidKey[] = [];

            for(const path of keyPath) {
                if(!(path in data)) {
                    return null;
                }
                
                const propertyName = path as StoreProperties<Name>;
                const value = data[propertyName];
                
                if(!this.isValidKey(value)) {
                    return null;
                }

                key.push(value as IDBValidKey);
            }

            return key;

        } else {

            if(!(keyPath in data)) {
                return null;
            }

            const propertyName = keyPath as StoreProperties<Name>;
            const value = data[propertyName];

            if(!this.isValidKey(value)) {
                return null;
            }

            return value as IDBValidKey;
        }
    }


    private promisifyRequest<T>(request: IDBRequest<T>)
    {
        return new Promise<T>((resolve, reject) => {
            const unlisten = () => {
                request.removeEventListener("success", success);
                request.removeEventListener("error", error);
            };

            const success = () => {
                resolve(request.result);
                unlisten();
            };

            const error = () => {
                reject(request.error);
                unlisten();
            };

            request.addEventListener("success", success);
            request.addEventListener("error", error);
        });
    }

    private promisifyTransaction(transaction: IDBTransaction): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
            const unlisten = () => {
                transaction.removeEventListener('complete', complete);
                transaction.removeEventListener('error', error);
                transaction.removeEventListener('abort', error);
            };

            const complete = () => {
                resolve();
                unlisten();
            };

            const error = () => {
                reject(transaction.error);
                unlisten();
            };

            transaction.addEventListener('complete', complete);
            transaction.addEventListener('error', error);
            transaction.addEventListener('abort', error);
        });
    }

    private isValidKey(key: any): key is IDBValidKey
    {
        return typeof key === "string"
            || typeof key === "number"
            || key instanceof Date
            || key instanceof ArrayBuffer
            || (key instanceof Array && key.every(value => typeof value === "string"))
            || (key instanceof Array && key.every(value => typeof value === "number"))
            || (key instanceof Array && key.every(value => value instanceof Date))
            || (key instanceof Array && key.every(value => value instanceof ArrayBuffer));
    }
}