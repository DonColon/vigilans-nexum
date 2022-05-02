import { ComponentConstructor } from "./Component";
import { Entity } from "./Entity";
import { WorldEvent } from "./event/GameEvent";


interface QuerySettings
{
    allowlist: ComponentConstructor<any>[],
    blocklist?: ComponentConstructor<any>[]
}


export class Query
{
    private allowlist: Set<ComponentConstructor<any>>;
    private blocklist: Set<ComponentConstructor<any>>;
    private entities: Set<Entity>;


    constructor(settings: QuerySettings)
    {
        this.allowlist = new Set<ComponentConstructor<any>>(settings.allowlist);
        this.blocklist = new Set<ComponentConstructor<any>>(settings.blocklist);
        this.entities = new Set<Entity>();

        for(const entity of world.getEntities()) {
            if(this.match(entity)) {
                this.entities.add(entity);
            }
        }

        world.on("componentsChanged", this.onComponentsChanged.bind(this));
    }


    private onComponentsChanged(event: WorldEvent)
    {
        if(this.match(event.entity)) {
            this.entities.add(event.entity);
        } else {
            this.entities.delete(event.entity);
        }
    }

    private match(entity: Entity): boolean
    {
        return entity.hasAllComponent(this.allowlist)
            && !entity.hasAnyComponent(this.blocklist);
    }


    public getResultSet(): Set<Entity>
    {
        return this.entities;
    }
}