import { randomUUID } from "utils/Randomizer";
import { Component, ComponentConstructor } from "./Component";
import { EventType } from "./WorldEvent";


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
        const name = (typeof componentType === "string") ? componentType : componentType.componentName;
        return this.components.get(name) as Component<any>;
    }

    public addComponent(componentType: ComponentConstructor<any> | string, values: object): Entity
    {
        const constructor = (typeof componentType === "string") ? world.getComponent(componentType) : componentType;
        const component = new constructor(values);

        this.componentTypes.set(constructor.componentName, constructor);
        this.components.set(constructor.componentName, component);

        world.dispatch(EventType.COMPONENT_CHANGED, { entity: this });
        return this;
    }

    public removeComponent(componentType: ComponentConstructor<any> | string): Entity
    {
        const name = (typeof componentType === "string") ? componentType : componentType.componentName;

        this.componentTypes.delete(name);
        this.components.delete(name);

        world.dispatch(EventType.COMPONENT_CHANGED, { entity: this });
        return this;
    }

    public reset(): Entity
    {
        this.componentTypes.clear();
        this.components.clear();

        world.dispatch(EventType.COMPONENT_CHANGED, { entity: this });
        return this;
    }


    public hasComponent(componentType: ComponentConstructor<any> | string): boolean
    {
        const name = (typeof componentType === "string") ? componentType : componentType.componentName;
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