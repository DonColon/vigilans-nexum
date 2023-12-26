import { GameError } from "core/GameError";
import { Repository, RepositorySettings } from "./Repository";
import { StoreNames } from "./DatabaseSchema";


export interface DatabaseConfiguration
{
    version: number,
    repositories: {
        [Name in StoreNames]: RepositorySettings
    }
}


export class LocalDatabase
{
    private repositories: Map<StoreNames, Repository>;
    private database!: IDBDatabase;


    constructor(private id: string, private config: DatabaseConfiguration)
    {
        this.repositories = new Map<StoreNames, Repository>();
    }


    public connect()
    {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(this.id, this.config.version);

            const unlisten = () => {
                request.removeEventListener("upgradeneeded", upgrade);
                request.removeEventListener("success", success);
                request.removeEventListener("error", error);
            };

            const upgrade = () => {
                this.database = request.result;
                this.initialize();
            };

            const success = () => {
                this.database = request.result;
                this.load();
                
                resolve();
                unlisten();
            };

            const error = () => {
                reject(request.error);
                unlisten();
            };

            request.addEventListener("upgradeneeded", upgrade);
            request.addEventListener("success", success);
            request.addEventListener("error", error);
        });
    }

    private load()
    {
        for(const name of Object.keys(this.config.repositories)) {
            const repositoryName = this.asStoreName(name);

            if(!repositoryName) {
                throw new GameError(`The repository ${name} is not a valid store name`);
            }

            if(this.database.objectStoreNames.contains(name)) {
                this.repositories.set(repositoryName, new Repository(repositoryName, this.database));
            }
        }
    }

    private initialize()
    {
        for(const [name, settings] of Object.entries(this.config.repositories)) {
            if(!this.database.objectStoreNames.contains(name)) {
                this.database.createObjectStore(name, settings);
            }
        }

        for(const name of this.database.objectStoreNames) {
            const repositoryName = this.asStoreName(name);

            if(!repositoryName) {
                this.database.deleteObjectStore(name);
            }
        }
    }

    private asStoreName(name: string): StoreNames | null
    {
        if(name in this.config.repositories) {
            return name as StoreNames;
        } else {
            return null;
        }
    }
    

    public getRepository<Name extends StoreNames>(name: Name): Repository<Name>
    {
        const repository = this.repositories.get(name);

        if(repository === undefined) {
            throw new GameError(`Repository ${name} does not exist`);
        }

        return repository;
    }

    public disconnect()
    {
        this.database.close();
    }
}