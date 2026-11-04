import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Component, ComponentConstructor } from "@/core/ecs/Component";
import { Entity, EntityType } from "@/core/ecs/Entity";
import { ReactiveSystemConstructor, ScheduledSystemConstructor, System, SystemConstructor } from "@/core/ecs/System";
import { ScheduledSystem } from "@/core/ecs/ScheduledSystem";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { GameState, GameStateConstructor } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { EventBus } from "@/core/events/EventBus";
import { binaryInsert } from "@/core/utils/Arrays";
import { SyncSystem } from "./SyncSystem";

@GameCoreService()
export class World {
	private readonly components: Map<string, ComponentConstructor<any>>;
	private readonly states: Map<string, GameStateConstructor>;
	private readonly entities: Map<string, Entity>;
	private readonly systems: Map<string, System>;

	private updateSchedule: ScheduledSystem[];
	private syncSchedule: ScheduledSystem[];
	private renderSchedule: ScheduledSystem[];

	@GameCoreService(EventBus)
	private eventBus!: EventBus;

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
		this.eventBus.dispatch("entityRemoved", { entity: entity });
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

	/** Every entity carrying `componentType`, in registration order. */
	public entitiesWith(componentType: ComponentConstructor<any> | string): Entity[] {
		return this.getEntities().filter((entity) => entity.hasComponent(componentType));
	}

	/**
	 * The one entity carrying `componentType`, or null when none does - for the
	 * singletons a map creates once, like the cursor or the army's convoy.
	 */
	public entityWith(componentType: ComponentConstructor<any> | string): Entity | null {
		return this.getEntities().find((entity) => entity.hasComponent(componentType)) ?? null;
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

	/**
	 * Registers a system. A scheduled one - update, sync or render - is built
	 * with the priority it runs at and put in its schedule; a reactive one is
	 * built with nothing and only kept, so it can be found, disabled and
	 * disposed - its handlers run on the event bus, ordered there. Giving a
	 * reactive system a priority, or a scheduled one none, is a mistake and
	 * throws.
	 */
	public registerSystem(systemType: ScheduledSystemConstructor, priority: number): this;
	public registerSystem(systemType: ReactiveSystemConstructor): this;
	public registerSystem(systemType: SystemConstructor, priority?: number): this {
		if (this.hasSystem(systemType)) {
			throw new GameError(`System ${systemType.name} is already registered`);
		}

		// Built, then initialised: only once construction is over have every
		// subclass's field initializers run, so `initialize()` may set anything.
		const system = new (systemType as new (priority?: number) => System)(priority);
		system.initialize();

		if (system instanceof ScheduledSystem) {
			if (priority === undefined) {
				system.dispose();
				throw new GameError(`System ${systemType.name} runs on the clock and needs a priority`);
			}

			this.scheduleSystem(system);
		} else if (priority !== undefined) {
			system.dispose();
			throw new GameError(`System ${systemType.name} runs on events and has no priority - order its handlers with subscribe(name, handler, priority)`);
		}

		this.systems.set(systemType.name, system);
		return this;
	}

	private scheduleSystem(system: ScheduledSystem) {
		if (system instanceof UpdateSystem) {
			binaryInsert(this.updateSchedule, system, ScheduledSystem.byPriority);
		} else if (system instanceof SyncSystem) {
			binaryInsert(this.syncSchedule, system, ScheduledSystem.byPriority);
		} else if (system instanceof RenderSystem) {
			binaryInsert(this.renderSchedule, system, ScheduledSystem.byPriority);
		} else {
			system.dispose();
			throw new GameError(`System ${system.constructor.name} must extend UpdateSystem, SyncSystem or RenderSystem`);
		}
	}

	public unregisterSystem(systemType: SystemConstructor): this {
		const system = this.getSystem(systemType);
		system.dispose();

		this.systems.delete(systemType.name);

		if (system instanceof ScheduledSystem) {
			this.unscheduleSystem(system);
		}

		return this;
	}

	private unscheduleSystem(system: ScheduledSystem) {
		if (system instanceof UpdateSystem) {
			this.updateSchedule = this.updateSchedule.filter((s) => s !== system);
		} else if (system instanceof SyncSystem) {
			this.syncSchedule = this.syncSchedule.filter((s) => s !== system);
		} else if (system instanceof RenderSystem) {
			this.renderSchedule = this.renderSchedule.filter((s) => s !== system);
		} else {
			throw new GameError(`System ${system.constructor.name} must extend UpdateSystem, SyncSystem or RenderSystem`);
		}
	}

	public getSystem<Type extends System>(systemType: SystemConstructor<Type>): Type {
		const system = this.systems.get(systemType.name);

		if (system === undefined) {
			throw new GameError(`System ${systemType.name} is not registered`);
		}

		return system as Type;
	}

	public getUpdateSchedule(): ScheduledSystem[] {
		return this.updateSchedule;
	}

	public getSyncSchedule(): ScheduledSystem[] {
		return this.syncSchedule;
	}

	public getRenderSchedule(): ScheduledSystem[] {
		return this.renderSchedule;
	}

	public hasSystem(systemType: SystemConstructor | string): boolean {
		const systemName = typeof systemType === "string" ? systemType : systemType.name;
		return this.systems.has(systemName);
	}
}
