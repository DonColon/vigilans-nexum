export interface RepositorySettings
{
    autoIncrement?: boolean,
    key?: string | string[]
}


export class Repository
{
    constructor(private name: string, private database: IDBDatabase) {}


    public async create(data: any): Promise<IDBValidKey>
    {
        const transaction = this.database.transaction(this.name, "readwrite");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.add(data));

        const [result, _] = await Promise.all([operation, done]);
        return result;
    }

    public async read(key: IDBValidKey): Promise<any>
    {
        const transaction = this.database.transaction(this.name, "readonly");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.get(key));

        const [result, _] = await Promise.all([operation, done]);
        return result;
    }

    public async update(data: any): Promise<IDBValidKey>
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

    public async list(): Promise<any[]>
    {
        const transaction = this.database.transaction(this.name, "readonly");
        const done = this.promisifyTransaction(transaction);

        const store = transaction.objectStore(this.name);
        const operation = this.promisifyRequest(store.getAll());

       const [result, _] = await Promise.all([operation, done]);
       return result;
    }

    public async exists(data: any): Promise<boolean>
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

    public async save(data: any): Promise<IDBValidKey>
    {
        const exists = await this.exists(data);

        if(exists) {
            return this.update(data);
        } else {
            return this.create(data);
        }
    }


    private extractKey(data: any, store: IDBObjectStore): IDBValidKey | null
    {
        const keyPath = store.keyPath;

        if(Array.isArray(keyPath)) {
            const key: IDBValidKey[] = [];

            for(const path of keyPath) {
                const value = data[path];

                if(value === undefined || value === null) {
                    return null;
                }

                key.push(data[path]);
            }

            return key;

        } else {

            const value = data[keyPath];

            if(value === undefined || value === null) {
                return null;
            }

            return data[keyPath]
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
}