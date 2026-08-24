import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Component, ComponentConstructor } from "@/core/ecs/Component";
import { Entity, EntityType } from "@/core/ecs/Entity";
import { System, SystemConstructor } from "@/core/ecs/System";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { GameState, GameStateConstructor } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { EventSystem } from "@/core/events/EventSystem";
import { binaryInsert } from "@/core/utils/Arrays";
import { SyncSystem } from "./SyncSystem";

@GameCoreService()
export class World {
	private readonly components: Map<string, ComponentConstructor<any>>;
	private readonly states: Map<string, GameStateConstructor>;
	private readonly entities: Map<string, Entity>;
	private readonly systems: Map<string, System>;

	private updateSchedule: System[];
	private syncSchedule: System[];
	private renderSchedule: System[];

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	constructor() {
		this.components = new Map<string, ComponentConstructor<any>>();
		this.states = new Map<string, GameStateConstructor>();
		this.entities = new Map<string, Entity>();
		this.systems = new Map<string, System>();

		this.updateSchedule = [];
		this.syncSchedule = [];
		this.renderSchedule = [];
	}

	public update(elapsed: number, frame: number) {
		for (const system of this.updateSchedule) {
			if (system.isEnabled()) {
				system.execute(elapsed, frame);
			}
		}

		for (const system of this.syncSchedule) {
			if (system.isEnabled()) {
				system.execute(elapsed, frame);
			}
		}
	}

	public render(elapsed: number, frame: number) {
		for (const system of this.renderSchedule) {
			if (system.isEnabled()) {
				system.execute(elapsed, frame);
			}
		}
	}

	public registerComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this {
		if (componentType.type === Component.type) {
			throw new GameError(`Component ${componentType.name} must declare its own static type`);
		}

		if (this.hasComponent(componentType)) {
			throw new GameError(`Component ${componentType.type} is already registered`);
		}

		this.components.set(componentType.type, componentType);
		return this;
	}

	public unregisterComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this {
		this.components.delete(componentType.type);
		return this;
	}

	public getComponent(name: string): ComponentConstructor<any> {
		const component = this.components.get(name);

		if (component === undefined) {
			throw new GameError(`Component ${name} is not registered`);
		}

		return component;
	}

	public getComponents(): ComponentConstructor<any>[] {
		return Array.from(this.components.values());
	}

	public hasComponent<T extends JsonSchema>(componentType: ComponentConstructor<T> | string): boolean {
		const componentName = typeof componentType === "string" ? componentType : componentType.type;
		return this.components.has(componentName);
	}

	public registerEntityState(stateType: GameStateConstructor): this {
		if (stateType.type === GameState.type) {
			throw new GameError(`Entity State ${stateType.name} must declare its own static type`);
		}

		if (this.hasEntityState(stateType)) {
			throw new GameError(`Entity State ${stateType.type} is already registered`);
		}

		this.states.set(stateType.type, stateType);
		return this;
	}

	public unregisterEntityState(stateType: GameStateConstructor): this {
		this.states.delete(stateType.type);
		return this;
	}

	public getEntityState(name: string): GameStateConstructor {
		const state = this.states.get(name);

		if (state === undefined) {
			throw new GameError(`Entity State ${name} is not registered`);
		}

		return state;
	}

	public getEntityStates(): GameStateConstructor[] {
		return Array.from(this.states.values());
	}

	public hasEntityState(stateType: GameStateConstructor | string): boolean {
		const stateName = typeof stateType === "string" ? stateType : stateType.type;
		return this.states.has(stateName);
	}

	public registerEntity(entityType: EntityType): this {
		if (this.hasEntity(entityType)) {
			throw new GameError(`Entity ${entityType.id} already exists`);
		}

		const entity = Entity.parse(entityType);
		this.entities.set(entity.getID(), entity);
		return this;
	}

	public createEntity(id?: string): Entity {
		if (id && this.hasEntity(id)) {
			throw new GameError(`Entity ${id} already exists`);
		}

		const entity = new Entity(id);
		this.entities.set(entity.getID(), entity);
		return entity;
	}

	public unregisterEntity(entity: Entity): this {
		this.entities.delete(entity.getID());
		this.eventSystem.dispatch("entityRemoved", { entity: entity });
		return this;
	}

	public getEntity(id: string): Entity {
		const entity = this.entities.get(id);

		if (entity === undefined) {
			throw new GameError(`Entity ${id} does not exist`);
		}

		return entity;
	}

	public getEntities(): Entity[] {
		return Array.from(this.entities.values());
	}

	public hasEntity(entity: Entity | EntityType | string): boolean {
		let entityID;

		if (entity instanceof Entity) {
			entityID = entity.getID();
		} else if (typeof entity === "string") {
			entityID = entity;
		} else {
			entityID = entity.id;
		}

		return this.entities.has(entityID);
	}

	public registerSystem(systemType: SystemConstructor, priority: number): this {
		if (this.hasSystem(systemType)) {
			throw new GameError(`System ${systemType.name} is already registered`);
		}

		const system = new systemType(priority);
		this.systems.set(systemType.name, system);

		this.scheduleSystem(system);
		return this;
	}

	private scheduleSystem(system: System) {
		if (system instanceof UpdateSystem) {
			binaryInsert(this.updateSchedule, system, System.byPriority);
		} else if (system instanceof SyncSystem) {
			binaryInsert(this.syncSchedule, system, System.byPriority);
		} else if (system instanceof RenderSystem) {
			binaryInsert(this.renderSchedule, system, System.byPriority);
		} else {
			throw new GameError(`System ${system.constructor.name} is neither an UpdateSystem nor a RenderSystem`);
		}
	}

	public unregisterSystem(systemType: SystemConstructor): this {
		const system = this.getSystem(systemType);
		system.dispose();

		this.systems.delete(systemType.name);
		this.unscheduleSystem(system);
		return this;
	}

	private unscheduleSystem(system: System) {
		if (system instanceof UpdateSystem) {
			this.updateSchedule = this.updateSchedule.filter((s) => s !== system);
		} else if (system instanceof SyncSystem) {
			this.syncSchedule = this.syncSchedule.filter((s) => s !== system);
		} else if (system instanceof RenderSystem) {
			this.renderSchedule = this.renderSchedule.filter((s) => s !== system);
		} else {
			throw new GameError(`System ${system.constructor.name} is neither an UpdateSystem nor a RenderSystem`);
		}
	}

	public getSystem(systemType: SystemConstructor): System {
		const system = this.systems.get(systemType.name);

		if (system === undefined) {
			throw new GameError(`System ${systemType.name} is not registered`);
		}

		return system;
	}

	public getUpdateSchedule(): System[] {
		return this.updateSchedule;
	}

	public getSyncSchedule(): System[] {
		return this.syncSchedule;
	}

	public getRenderSchedule(): System[] {
		return this.renderSchedule;
	}

	public hasSystem(systemType: SystemConstructor | string): boolean {
		const systemName = typeof systemType === "string" ? systemType : systemType.name;
		return this.systems.has(systemName);
	}
}
