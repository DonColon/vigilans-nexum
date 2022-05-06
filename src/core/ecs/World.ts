import { ComponentConstructor } from "./Component";
import { Entity } from "./Entity";
import { EventDispatcher } from "../EventDispatcher";
import { System, SystemConstructor } from "./System";


export class World extends EventDispatcher
{
    private components: Map<string, ComponentConstructor<any>>;
    private entities: Map<string, Entity>;
    private systems: Map<string, System>;


    constructor()
    {
        super();
        this.components = new Map<string, ComponentConstructor<any>>();
        this.entities = new Map<string, Entity>();
        this.systems = new Map<string, System>();
    }


    public execute(elapsed: number)
    {
        const schedule = Array.from(this.systems.values());
        
        schedule.sort(System.byPriority);
        
        for(const system of schedule) {
            if(system.isEnabled()) {
                system.execute(elapsed);
            }
        }
    }


    public registerComponent(componentType: ComponentConstructor<any>): World
    {
        this.components.set(componentType.jsonName, componentType);
        return this;
    }

    public registerEntity(entity: Entity): World
    {
        this.entities.set(entity.getID(), entity);
        return this;
    }

    public registerSystem(systemType: SystemConstructor, priority: number): World
    {
        const system = new systemType(priority);
        this.systems.set(systemType.jsonName, system);
        return this;
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

    public getSystem(name: string): System
    {
        return this.systems.get(name) as System;
    }

    public getSystems(): Set<System>
    {
        return new Set<System>(this.systems.values());
    }
}