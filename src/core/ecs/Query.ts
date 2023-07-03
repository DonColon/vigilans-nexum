import { WorldEvent } from "./WorldEvent";
import { ComponentConstructor } from "./Component";
import { Entity } from "./Entity";


export interface QueryList
{
    [queryName: string]: Query
}

interface QuerySettings
{
    allowlist?: ComponentConstructor<any>[],
    blocklist?: ComponentConstructor<any>[]
}


export class Query
{
    private allowlist: ComponentConstructor<any>[];
    private blocklist: ComponentConstructor<any>[];
    private entities: Entity[];


    constructor(settings: QuerySettings)
    {
        this.allowlist = settings.allowlist || [];
        this.blocklist = settings.blocklist || [];
        this.entities = [];

        for(const entity of world.getEntities()) {
            if(this.match(entity)) {
                this.entities.push(entity);
            }
        }

        eventSystem.subscribe("entityChanged", event => this.onEntityChanged(event));
    }


    private onEntityChanged(event: WorldEvent)
    {
        if(this.match(event.entity)) {
            this.entities.push(event.entity);
        } else {
            this.removeEntity(event.entity);
        }
    }

    private removeEntity(entity: Entity)
    {
        const index = this.entities.indexOf(entity);
        this.entities.splice(index, 1);
    }

    private match(entity: Entity): boolean
    {
        return entity.hasAllComponent(this.allowlist)
            && !entity.hasAnyComponent(this.blocklist);
    }


    public getResult(): Entity[]
    {
        return this.entities;
    }
}