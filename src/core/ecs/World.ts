/* eslint-disable @typescript-eslint/no-explicit-any */

import { GameError } from "core/GameError";
import { JsonSchema } from "./JsonSchema";
import { ComponentConstructor } from "./Component";
import { Entity, EntityType } from "./Entity";
import { System, SystemConstructor } from "./System";
import { UpdateSystem } from "./UpdateSystem";
import { RenderSystem } from "./RenderSystem";
import { GameStateConstructor } from "core/GameState";

export class World {
	private components: Map<string, ComponentConstructor<any>>;
	private states: Map<string, GameStateConstructor>;
	private entities: Map<string, Entity>;
	private systems: Map<string, System>;

	private updateSchedule: System[];
	private renderSchedule: System[];

	constructor() {
		this.components = new Map<string, ComponentConstructor<any>>();
		this.states = new Map<string, GameStateConstructor>();
		this.entities = new Map<string, Entity>();
		this.systems = new Map<string, System>();

		this.updateSchedule = [];
		this.renderSchedule = [];
	}

	public update(elapsed: number, frame: number) {
		for (const system of this.updateSchedule) {
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
		if (this.hasComponent(componentType)) {
			throw new GameError(`Component ${componentType.name} is already registered`);
		}

		this.components.set(componentType.name, componentType);
		return this;
	}

	public unregisterComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): this {
		this.components.delete(componentType.name);
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
		const componentName = (typeof componentType === "string") ? componentType : componentType.name;
		return this.components.has(componentName);
	}

	public registerEntityState(stateType: GameStateConstructor): this {
		if (this.hasEntityState(stateType)) {
			throw new GameError(`Entity State ${stateType.name} is already registered`);
		}

		this.states.set(stateType.name, stateType);
		return this;
	}

	public unregisterEntityState(stateType: GameStateConstructor): this {
		this.states.delete(stateType.name);
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
		const stateName = (typeof stateType === "string") ? stateType : stateType.name;
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

	public hasEntity(entity: Entity| EntityType | string): boolean {
		let entityID;

		if(entity instanceof Entity) {
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

		this.scheduleUpdateSystems();
		this.scheduleRenderSystems();
		return this;
	}

	public unregisterSystem(systemType: SystemConstructor): this {
		this.systems.delete(systemType.name);
		this.scheduleUpdateSystems();
		this.scheduleRenderSystems();
		return this;
	}

	private scheduleUpdateSystems() {
		const systems = Array.from(this.systems.values());
		this.updateSchedule = systems.filter((system) => system instanceof UpdateSystem);
		this.updateSchedule.sort(System.byPriority);
	}

	private scheduleRenderSystems() {
		const systems = Array.from(this.systems.values());
		this.renderSchedule = systems.filter((system) => system instanceof RenderSystem);
		this.renderSchedule.sort(System.byPriority);
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

	public getRenderSchedule(): System[] {
		return this.renderSchedule;
	}

	public hasSystem(systemType: SystemConstructor | string): boolean {
		const systemName = (typeof systemType === "string") ? systemType : systemType.name;
		return this.systems.has(systemName);
	}
}
