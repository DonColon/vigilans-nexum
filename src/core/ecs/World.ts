import { GameError } from "core/GameError";
import { JsonSchema } from "./JsonSchema";
import { ComponentConstructor } from "./Component";
import { Entity } from "./Entity";
import { System, SystemConstructor } from "./System";


export class World
{
    private components: Map<string, ComponentConstructor<any>>;
    private entities: Map<string, Entity>;
    private systems: Map<string, System>;
    private schedule: System[];


    constructor()
    {
        this.components = new Map<string, ComponentConstructor<any>>();
        this.entities = new Map<string, Entity>();
        this.systems = new Map<string, System>();
        this.schedule = [];
    }


    public execute(elapsed: number, frame: number)
    {
        const schedule = this.getSchedule();
        
        for(const system of schedule) {
            if(system.isEnabled()) {
                system.execute(elapsed, frame);
            }
        }
    }


    public registerComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this
    {
        if(this.components.has(componentType.name)) {
            throw new GameError(`Component ${componentType.name} is already registered`);
        }

        this.components.set(componentType.name, componentType);
        return this;
    }

    public unregisterComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this
    {
        this.components.delete(componentType.name);
        return this;
    }

    public createEntity(id?: string): Entity
    {
        if(id && this.entities.has(id)) {
            throw new GameError(`Entity ${id} already exists`);
        }

        const entity = new Entity(id);
        this.entities.set(entity.getID(), entity);
        return entity;
    }

    public deleteEntity(id: string)
    {
        this.entities.delete(id);
    }

    public registerSystem(systemType: SystemConstructor, priority: number): this
    {
        if(this.components.has(systemType.name)) {
            throw new GameError(`System ${systemType.name} is already registered`);
        }

        const system = new systemType(priority);
        this.systems.set(systemType.name, system);
        return this;
    }

    public unregisterSystem(systemType: SystemConstructor): this
    {
        this.systems.delete(systemType.name);
        return this;
    }


    public hasComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): boolean
    {
        return this.components.has(componentType.name);
    }

    public hasEntity(id: string): boolean
    {
        return this.entities.has(id);
    }

    public hasSystem(systemType: SystemConstructor): boolean
    {
        return this.systems.has(systemType.name);
    }


    public getComponent(name: string): ComponentConstructor<any>
    {
        const component = this.components.get(name);

        if(component === undefined) {
            throw new GameError(`Component ${name} is not registered`);
        }

        return component;
    }

    public getComponents(): ComponentConstructor<any>[]
    {
        return Array.from(this.components.values());
    }

    public getEntity(id: string): Entity
    {
        const entity = this.entities.get(id);

        if(entity === undefined) {
            throw new GameError(`Entity ${id} does not exist`);
        }

        return entity;
    }

    public getEntities(): Entity[]
    {
        return Array.from(this.entities.values());
    }

    public getSystem(systemType: SystemConstructor): System
    {
        const system = this.systems.get(systemType.name);

        if(system === undefined) {
            throw new GameError(`System ${systemType.name} is not registered`);
        }

        return system;
    }

    public getSystems(): System[]
    {
        return Array.from(this.systems.values());
    }

    public getSchedule(): System[]
    {
        if(this.systems.size !== this.schedule.length) {
            this.schedule = Array.from(this.systems.values());
            this.schedule.sort(System.byPriority);
        }

        return this.schedule;
    }
}