import { ComponentConstructor } from "./Component";
import { Entity } from "./Entity";
import { EventDispatcher } from "./EventDispatcher";


export class World extends EventDispatcher
{
    private components: Map<string, ComponentConstructor<any>>;
    private entities: Map<string, Entity>;


    constructor()
    {
        super();
        this.components = new Map<string, ComponentConstructor<any>>();
        this.entities = new Map<string, Entity>();
    }


    public getComponent(name: string): ComponentConstructor<any>
    {
        return this.components.get(name) as ComponentConstructor<any>;
    }

    public getComponents(): Set<ComponentConstructor<any>>
    {
        return new Set<ComponentConstructor<any>>(this.components.values());
    }

    public getEntity(id: string): Entity
    {
        return this.entities.get(id) as Entity;
    }

    public getEntities(): Set<Entity>
    {
        return new Set<Entity>(this.entities.values());
    }
}