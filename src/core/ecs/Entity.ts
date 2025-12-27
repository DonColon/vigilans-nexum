import { GameError } from "@/core/GameError";
import { randomUUID } from "@/core/math/generation/Randomizer";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Component, ComponentConstructor } from "@/core/ecs/Component";
import { GameStateManager } from "@/core/GameStateManager";
import { GameStateConstructor } from "@/core/GameState";
import { EventSystem } from "@/core/events/EventSystem";
import { GameCoreService } from "@/core/service/GameCoreService";
import { World } from "@/core/ecs/World";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";

export interface EntityType {
	id: string;
	enabled: boolean;
	states: string[];
	components: JsonSchema;
}

export class Entity {
	private readonly components: Map<string, Component<JsonSchema>>;
	private readonly stateManager: GameStateManager;
	private enabled: boolean;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	@GameCoreService("World")
	private world!: World;

	constructor(private readonly id: string = randomUUID()) {
		this.components = new Map<string, Component<JsonSchema>>();
		this.stateManager = new GameStateManager();
		this.enabled = true;
	}

	public static parse(json: EntityType | string): Entity {
		const entityType: EntityType = typeof json === "string" ? JSON.parse(json) : json;
		const entity = new Entity(entityType.id);
		const stateManager = entity.getStateManager();

		const world = ServiceRegistry.get<World>(World.name);

		for (const state of entityType.states) {
			const stateType = world.getEntityState(state);
			entity.addState(stateType);
			stateManager.push(state);
		}

		for (const [name, data] of Object.entries(entityType.components)) {
			const componentType = world.getComponent(name);
			entity.addComponent(componentType, data);
		}

		return entity;
	}

	public addComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>, data: T): this {
		const world = this.world ?? ServiceRegistry.get<World>(World.name);

		if (!world.hasComponent(componentType)) {
			throw new GameError(`${componentType.name} not defined in world`);
		}

		const component = new componentType(data);
		this.components.set(componentType.name, component);

		this.eventSystem.dispatch("entityChanged", { entity: this });
		return this;
	}

	public removeComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this {
		this.components.delete(componentType.name);

		this.eventSystem.dispatch("entityChanged", { entity: this });
		return this;
	}

	public getComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): Component<T> {
		const component = this.components.get(componentType.name);

		if (component === undefined) {
			throw new GameError(`Component not defined on entity ${this.id}`);
		}

		return component as Component<T>;
	}

	public getComponentData<T extends JsonSchema>(componentType: ComponentConstructor<T>): T {
		const component = this.getComponent(componentType);
		return component.toObject();
	}

	public hasComponent<T extends JsonSchema>(componentType: ComponentConstructor<T> | string): boolean {
		const componentName = typeof componentType === "string" ? componentType : componentType.name;
		return this.components.has(componentName);
	}

	public hasAllComponents(componentTypes: string[]): boolean {
		return componentTypes.every((componentType) => this.hasComponent(componentType));
	}

	public hasAnyComponents(componentTypes: string[]): boolean {
		return componentTypes.some((componentType) => this.hasComponent(componentType));
	}

	public addState(stateType: GameStateConstructor): this {
		const world = this.world ?? ServiceRegistry.get<World>(World.name);

		if (!world.hasEntityState(stateType)) {
			throw new GameError(`${stateType.name} not defined in world`);
		}

		this.stateManager.registerState(stateType);
		return this;
	}

	public removeState(stateType: GameStateConstructor): this {
		this.stateManager.unregisterState(stateType);
		return this;
	}

	public getStateManager(): GameStateManager {
		return this.stateManager;
	}

	public reset(): this {
		this.components.clear();
		this.stateManager.clear();

		this.eventSystem.dispatch("entityChanged", { entity: this });
		return this;
	}

	public toObject(): EntityType {
		const entity: EntityType = {
			id: this.id,
			enabled: this.enabled,
			states: [],
			components: {}
		};

		const states = this.stateManager.getCurrentStates();
		entity.states = states.map((state) => state.constructor.name);

		for (const [name, component] of this.components.entries()) {
			entity.components[name] = component.toObject();
		}

		return entity;
	}

	public toString(): string {
		const data = this.toObject();
		return JSON.stringify(data, null, "\t");
	}

	public getID(): string {
		return this.id;
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public enable() {
		this.enabled = true;
	}

	public disable() {
		this.enabled = false;
	}
}
