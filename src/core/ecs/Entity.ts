import { GameError } from "core/GameError";
import { Randomizer } from "core/utils/Randomizer";
import { JsonSchema } from "./JsonSchema";
import { Component, ComponentConstructor } from "./Component";


interface EntityType
{
    id: string,
    enabled: boolean,
    components: JsonSchema
}


export class Entity
{
    private componentTypes: Map<string, ComponentConstructor<any>>;
    private components: Map<string, Component<JsonSchema>>;

    private id: string;
    private enabled: boolean;


    constructor(id: string = Randomizer.randomUUID())
    {
        this.componentTypes = new Map<string, ComponentConstructor<any>>();
        this.components = new Map<string, Component<JsonSchema>>();

        this.id = id;
        this.enabled = true;
    }

    public static parse(json: string): Entity
    {
        const entityType: EntityType = JSON.parse(json);
        const entity = new Entity(entityType.id);

        for(const [name, data] of Object.entries(entityType.components)) {
            const componentType = world.getComponent(name);
            entity.addComponent(componentType, data);
        }

        return entity;
    }


    public addComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>, data: T): this
    {
        if(!world.hasComponent(componentType)) {
            return this;
        }

        const component = new componentType(data);

        this.componentTypes.set(componentType.name, componentType);
        this.components.set(componentType.name, component);

        eventSystem.dispatch("entityChanged", { entity: this });
        return this;
    }

    public removeComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this
    {
        this.componentTypes.delete(componentType.name);
        this.components.delete(componentType.name);

        eventSystem.dispatch("entityChanged", { entity: this });
        return this;
    }

    public getComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): Component<T>
    {
        const component = this.components.get(componentType.name);

        if(component === undefined) {
            throw new GameError(`Component not defined on entity ${this.id}`);
        }

        return component as Component<T>;
    }

    public getComponentData<T extends JsonSchema>(componentType: ComponentConstructor<T>): T
    {
        const component = this.getComponent(componentType);
        return component.toObject();
    }

    public reset(): this
    {
        this.componentTypes.clear();
        this.components.clear();

        eventSystem.dispatch("entityChanged", { entity: this });
        return this;
    }


    public hasComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): boolean
    {
        return this.componentTypes.has(componentType.name) 
            && this.components.has(componentType.name);
    }

    public hasAllComponent(componentTypes: ComponentConstructor<any>[]): boolean
    {
        for(const componentType of componentTypes) {
            if(!this.hasComponent(componentType)) {
                return false;
            }
        }

        return true;
    }

    public hasAnyComponent(componentTypes: ComponentConstructor<any>[]): boolean
    {
        for(const componentType of componentTypes) {
            if(this.hasComponent(componentType)) {
                return true;
            }
        }

        return false;
    }


    public toObject(): EntityType
    {
        const entity: EntityType = {
            id: this.id,
            enabled: this.enabled,
            components: {}
        };

        for (const [name, component] of this.components.entries()) {
            entity.components[name] = component.toObject();
        }

        return entity;
    }

    public toString(): string
    {
        const data = this.toObject();
        return JSON.stringify(data, null, "\t");
    }

    public getID(): string
    {
        return this.id;
    }

    public isEnabled(): boolean
    {
        return this.enabled;
    }

    public enable()
    {
        this.enabled = true;
    }

    public disable()
    {
        this.enabled = false;
    }
}