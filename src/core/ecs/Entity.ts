import { GameError } from "core/GameError";
import { Randomizer } from "core/utils/Randomizer";
import { JsonSchema } from "./JsonSchema";
import { Component, ComponentConstructor } from "./Component";
import { GameStateManager } from "core/GameStateManager";
import { GameStateConstructor } from "core/GameState";


export interface EntityType
{
    id: string,
    enabled: boolean,
    states: string[],
    components: JsonSchema
}


export class Entity
{
    private components: Map<string, Component<JsonSchema>>;
    private stateManager: GameStateManager;
    private enabled: boolean;


    constructor(private id: string = Randomizer.randomUUID())
    {
        this.components = new Map<string, Component<JsonSchema>>();
        this.stateManager = new GameStateManager();
        this.enabled = true;
    }

    public static parse(json: EntityType | string): Entity
    {
        const entityType: EntityType = (typeof json === "string") ? JSON.parse(json) : json;
        const entity = new Entity(entityType.id);

        for(const state of entityType.states) {
            const stateType = world.getEntityState(state);
            entity.addState(stateType);
        }

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
        this.components.set(componentType.name, component);

        eventSystem.dispatch("entityChanged", { entity: this });
        return this;
    }

    public removeComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this
    {
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

    public hasComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): boolean
    {
        return this.components.has(componentType.name);
    }

    public hasAllComponent<T extends JsonSchema>(componentTypes: ComponentConstructor<T>[]): boolean
    {
        return componentTypes.every(componentType => this.hasComponent(componentType));
    }

    public hasAnyComponent<T extends JsonSchema>(componentTypes: ComponentConstructor<T>[]): boolean
    {
        return componentTypes.some(componentType => this.hasComponent(componentType));
    }


    public addState(stateType: GameStateConstructor): this
    {
        if(!world.hasEntityState(stateType)) {
            return this;
        }

        this.stateManager.registerState(stateType);
        return this;
    }

    public removeState(stateType: GameStateConstructor): this
    {
        this.stateManager.unregisterState(stateType);
        return this;
    }

    public getStateManager(): GameStateManager
    {
        return this.stateManager;
    }


    public reset(): this
    {
        this.components.clear();
        this.stateManager.clear();

        eventSystem.dispatch("entityChanged", { entity: this });
        return this;
    }

    public toObject(): EntityType
    {
        const entity: EntityType = {
            id: this.id,
            enabled: this.enabled,
            states: [],
            components: {}
        };

        const states = this.stateManager.getCurrentStates();
        entity.states = states.map(state => state.constructor.name);

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