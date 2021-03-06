import { randomUUID } from "core/utils/Randomizer";
import { Component, ComponentConstructor } from "./Component";
import { JsonType } from "./JsonConversion";


interface EntityType
{
    id: string,
    alive: boolean,
    [key: string]: JsonType
}


export abstract class Entity
{
    protected componentTypes: Map<string, ComponentConstructor<any>>;
    protected components: Map<string, Component<any>>;

    protected id: string;
    protected alive: boolean;


    constructor(id: string = randomUUID())
    {
        this.componentTypes = new Map<string, ComponentConstructor<any>>();
        this.components = new Map<string, Component<any>>();

        this.id = id;
        this.alive = true;
    }


    public getComponent(componentType: ComponentConstructor<any> | string): Component<any>
    {
        const name = (typeof componentType === "string") ? componentType : componentType.jsonName;
        return this.components.get(name) as Component<any>;
    }

    public addComponent(componentType: ComponentConstructor<any> | string, values: object): Entity
    {
        const constructor = (typeof componentType === "string") ? world.getComponent(componentType) : componentType;
        const component = new constructor(values);

        this.componentTypes.set(constructor.jsonName, constructor);
        this.components.set(constructor.jsonName, component);

        world.dispatch("componentsChanged", { entity: this });
        return this;
    }

    public removeComponent(componentType: ComponentConstructor<any> | string): Entity
    {
        const name = (typeof componentType === "string") ? componentType : componentType.jsonName;

        this.componentTypes.delete(name);
        this.components.delete(name);

        world.dispatch("componentsChanged", { entity: this });
        return this;
    }

    public reset(): Entity
    {
        this.componentTypes.clear();
        this.components.clear();

        world.dispatch("componentsChanged", { entity: this });
        return this;
    }


    public hasComponent(componentType: ComponentConstructor<any> | string): boolean
    {
        const name = (typeof componentType === "string") ? componentType : componentType.jsonName;
        return this.componentTypes.has(name) && this.components.has(name);
    }

    public hasAllComponent(componentTypes: Set<ComponentConstructor<any>> | Set<string>): boolean
    {
        for(const componentType of componentTypes) {
            if(!this.hasComponent(componentType)) return false;
        }

        return true;
    }

    public hasAnyComponent(componentTypes: Set<ComponentConstructor<any>> | Set<string>): boolean
    {
        for(const componentType of componentTypes) {
            if(this.hasComponent(componentType)) return true;
        }

        return false;
    }


    public json(): EntityType
    {
        const entity: EntityType = {
            id: this.id,
            alive: this.alive,
        };

        for (const [name, component] of this.components.entries()) {
            entity[name] = component.json();
        }

        return entity;
    }

    public getID(): string
    {
        return this.id;
    }

    public isAlive(): boolean
    {
        return this.alive;
    }

    public setAlive(alive: boolean)
    {
        return this.alive = alive;
    }
}