import { randomUUID } from "utils/Randomizer";
import { Component, ComponentConstructor } from "./Component";


export abstract class Entity
{
    protected componentTypes: Map<string, ComponentConstructor>;
    protected component: Map<string, Component<object>>;

    protected id: string;
    protected alive: boolean;


    constructor(id: string = randomUUID())
    {
        this.componentTypes = new Map<string, ComponentConstructor>();
        this.component = new Map<string, Component<object>>();

        this.id = id;
        this.alive = true;
    }


    public getComponent(name: string): Component<object>
    {
        return this.component.get(name) as Component<object>;
    }

    public addComponent(componentType: ComponentConstructor, values: object): Entity
    {
        const component = componentType(values);
        this.componentTypes.set(componentType.componentName, componentType);
        this.component.set(componentType.componentName, component);
        return this;
    }

    public removeComponent(componentType: ComponentConstructor): Entity
    {
        this.componentTypes.delete(componentType.componentName);
        this.component.delete(componentType.componentName);
        return this;
    }

    public reset(): Entity
    {
        this.componentTypes.clear();
        this.component.clear();
        return this;
    }


    public hasComponent(name: string): boolean
    {
        return this.componentTypes.has(name) && this.component.has(name);
    }

    public hasAllComponent(components: string[]): boolean
    {
        for(const name of components) {
            if(!this.hasComponent(name)) return false;
        }

        return true;
    }

    public hasAnyComponent(components: string[]): boolean
    {
        for(const name of components) {
            if(this.hasComponent(name)) return true;
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