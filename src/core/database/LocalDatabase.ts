import { GameError } from "core/GameError";
import { Repository, RepositorySettings } from "./Repository";


export interface DatabaseConfiguration
{
    version: number,
    repositories: {
        [name: string]: RepositorySettings
    }
}


export class LocalDatabase
{
    private repositories: Map<string, Repository>;
    private database!: IDBDatabase;


    constructor(private id: string, private config: DatabaseConfiguration)
    {
        this.repositories = new Map<string, Repository>();
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

    public getRepository(name: string): Repository
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


    private load()
    {
        for(const name of Object.keys(this.config.repositories)) {
            if(this.database.objectStoreNames.contains(name)) {
                this.repositories.set(name, new Repository(name, this.database));
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
            if(!this.config.repositories[name]) {
                this.database.deleteObjectStore(name);
            }
        }
    }
}