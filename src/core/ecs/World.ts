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
		if (this.components.has(componentType.name)) {
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

	public hasComponent<T extends JsonSchema>(componentType: ComponentConstructor<T>): boolean {
		return this.components.has(componentType.name);
	}

	public registerEntityState(stateType: GameStateConstructor): this {
		if (this.states.has(stateType.name)) {
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

	public hasEntityState(stateType: GameStateConstructor): boolean {
		return this.states.has(stateType.name);
	}

	public registerEntity(entityType: EntityType): this {
		if (this.entities.has(entityType.id)) {
			throw new GameError(`Entity ${entityType.id} already exists`);
		}

		const entity = Entity.parse(entityType);
		this.entities.set(entity.getID(), entity);
		return this;
	}

	public createEntity(id?: string): Entity {
		if (id && this.entities.has(id)) {
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

	public hasEntity(entity: Entity): boolean {
		return this.entities.has(entity.getID());
	}

	public registerSystem(systemType: SystemConstructor, priority: number): this {
		if (this.components.has(systemType.name)) {
			throw new GameError(`System ${systemType.name} is already registered`);
		}

		const system = new systemType(priority);
		this.systems.set(systemType.name, system);

		if (system instanceof UpdateSystem) {
			this.scheduleUpdateSystems();
		} else if (system instanceof RenderSystem) {
			this.scheduleRenderSystems();
		}

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

	public unregisterSystem(systemType: SystemConstructor): this {
		this.systems.delete(systemType.name);
		return this;
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

	public hasSystem(systemType: SystemConstructor): boolean {
		return this.systems.has(systemType.name);
	}
}
