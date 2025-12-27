import { test, expect, suite, vi } from "vitest";
import { World } from "@/core/ecs/World";
import { Component } from "@/core/ecs/Component";
import { GameError } from "@/core/GameError";
import { GameState } from "@/core/GameState";
import { EntityType } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { System } from "@/core/ecs/System";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";

suite("World Test Suite", () => {
	class PointComponent extends Component<{
		x: number;
		y: number;
	}> {}

	class JumpState extends GameState {
		onPause(): void {}
		onResume(): void {}
		onEnter() {}
		onExit() {}
	}

	class MovementSystem extends UpdateSystem {
		queries = {
			query: new Query({})
		};

		public initialize(): void {}
		public execute(): void {}
	}

	class AttackSystem extends UpdateSystem {
		queries = {
			query: new Query({
				allowlist: [],
				blocklist: []
			})
		};

		public initialize(): void {}
		public execute(): void {}
	}

	class MapSystem extends RenderSystem {
		queries = {
			query: new Query({
				allowlist: [],
				blocklist: []
			})
		};

		public initialize(): void {}
		public execute(): void {}
	}

	test("Update the world one frame", () => {
		const world = ServiceRegistry.get<World>(World.name);
		world.registerSystem(MovementSystem, 0);
		world.registerSystem(MapSystem, 0);

		const movementSystem = world.getSystem(MovementSystem);
		const mapSystem = world.getSystem(MapSystem);

		const movementSystemExecute = vi.spyOn(movementSystem, "execute");
		const mapSystemExecute = vi.spyOn(mapSystem, "execute");

		world.update(20, 10);
		world.render(20, 10);

		expect(movementSystemExecute).toHaveBeenCalledTimes(1);
		expect(mapSystemExecute).toHaveBeenCalledTimes(1);

		movementSystem.disable();
		mapSystem.disable();

		world.update(20, 10);
		world.render(20, 10);

		expect(movementSystemExecute).toHaveBeenCalledTimes(1);
		expect(mapSystemExecute).toHaveBeenCalledTimes(1);
	});

	test("Register a component to the world", () => {
		const world = new World();
		world.registerComponent(PointComponent);

		expect(() => world.registerComponent(PointComponent)).toThrowError(GameError);
		expect(world.getComponent(PointComponent.name)).toEqual(PointComponent);
		expect(() => world.getComponent("MoveComponent")).toThrowError(GameError);

		const components = world.getComponents();
		expect(components[0]).toEqual(PointComponent);
	});

	test("Unregister a component from the world", () => {
		const world = new World();
		world.registerComponent(PointComponent);
		world.unregisterComponent(PointComponent);

		expect(() => world.getComponent(PointComponent.name)).toThrowError(GameError);

		const components = world.getComponents();
		expect(components).toHaveLength(0);
	});

	test("World has a component", () => {
		const world = new World();
		world.registerComponent(PointComponent);

		expect(world.hasComponent(PointComponent)).toBeTruthy();
		expect(world.hasComponent("PointComponent")).toBeTruthy();
	});

	test("Register an entity state to the world", () => {
		const world = new World();
		world.registerEntityState(JumpState);

		expect(() => world.registerEntityState(JumpState)).toThrowError(GameError);
		expect(world.getEntityState(JumpState.name)).toEqual(JumpState);
		expect(() => world.getEntityState("FallState")).toThrowError(GameError);

		const states = world.getEntityStates();
		expect(states[0]).toEqual(JumpState);
	});

	test("Unregister an entity state from the world", () => {
		const world = new World();
		world.registerEntityState(JumpState);
		world.unregisterEntityState(JumpState);

		expect(() => world.getEntityState(JumpState.name)).toThrowError(GameError);

		const states = world.getEntityStates();
		expect(states).toHaveLength(0);
	});

	test("World has an entity state", () => {
		const world = new World();
		world.registerEntityState(JumpState);

		expect(world.hasEntityState(JumpState)).toBeTruthy();
		expect(world.hasEntityState("JumpState")).toBeTruthy();
	});

	test("Create an entity to the world", () => {
		const world = new World();
		const entity = world.createEntity("1337");
		expect(() => world.createEntity("1337")).toThrowError(GameError);

		expect(world.getEntity("1337")).toEqual(entity);
		expect(() => world.getEntity("1338")).toThrowError(GameError);

		const entities = world.getEntities();
		expect(entities[0]).toEqual(entity);
	});

	test("Destroy an entity from the world", () => {
		const world = new World();
		const entity = world.createEntity("1337");
		world.unregisterEntity(entity);

		expect(() => world.getEntity("1337")).toThrowError(GameError);

		const entities = world.getEntities();
		expect(entities).toHaveLength(0);
	});

	test("World has an entity", () => {
		const world = new World();
		const entity = world.createEntity("1337");

		const entityType: EntityType = {
			id: "1337",
			enabled: true,
			components: {},
			states: []
		};

		expect(world.hasEntity(entity)).toBeTruthy();
		expect(world.hasEntity(entityType)).toBeTruthy();
		expect(world.hasEntity("1337")).toBeTruthy();
	});

	test("Register an entity to the world", () => {
		const world = new World();

		const entityType: EntityType = {
			id: "1337",
			enabled: true,
			components: {},
			states: []
		};

		world.registerEntity(entityType);
		expect(() => world.registerEntity(entityType)).toThrowError(GameError);

		const entity = world.getEntity("1337");
		expect(world.hasEntity(entity)).toBeTruthy();
		expect(() => world.getEntity("1338")).toThrowError(GameError);

		const entities = world.getEntities();
		expect(world.hasEntity(entities[0])).toBeTruthy();
	});

	test("Register a system to the world", () => {
		const world = new World();
		world.registerSystem(MapSystem, 0);
		world.registerSystem(MovementSystem, 0);
		expect(() => world.registerSystem(MovementSystem, 0)).toThrowError(GameError);

		expect(world.getSystem(MovementSystem)).toBeInstanceOf(MovementSystem);
		expect(() => world.getSystem(AttackSystem)).toThrowError(GameError);

		const updateSystems = world.getUpdateSchedule();
		expect(updateSystems[0]).toBeInstanceOf(MovementSystem);

		const renderSystems = world.getRenderSchedule();
		expect(renderSystems[0]).toBeInstanceOf(MapSystem);
	});

	test("Unregister a system from the world", () => {
		const world = new World();
		world.registerSystem(MovementSystem, 0);
		world.unregisterSystem(MovementSystem);

		expect(() => world.getSystem(MovementSystem)).toThrowError(GameError);

		const updateSystems = world.getUpdateSchedule();
		expect(updateSystems).toHaveLength(0);
	});

	test("Unregister a render system from the world (unscheduleSystem else branch)", () => {
		const world = new World();
		world.registerSystem(MapSystem, 0);
		world.unregisterSystem(MapSystem);

		expect(() => world.getSystem(MapSystem)).toThrowError(GameError);

		const renderSystems = world.getRenderSchedule();
		expect(renderSystems).toHaveLength(0);
	});

	test("World has a system", () => {
		const world = new World();
		world.registerSystem(MovementSystem, 0);

		expect(world.hasSystem(MovementSystem)).toBeTruthy();
		expect(world.hasSystem("MovementSystem")).toBeTruthy();
	});

	test("Throw error when registering system that is neither UpdateSystem nor RenderSystem", () => {
		// Create a system that extends System directly but is neither UpdateSystem nor RenderSystem
		class InvalidSystem extends System {
			queries = {};
			public initialize(): void {}
			public execute(): void {}
		}

		const world = new World();
		expect(() => world.registerSystem(InvalidSystem, 0))
			.toThrowError("System InvalidSystem is neither an UpdateSystem nor a RenderSystem");
	});

	test("Throw error when unregistering system that is neither UpdateSystem nor RenderSystem", () => {
		// Create a system that extends System directly
		class InvalidSystem extends System {
			queries = {};
			public initialize(): void {}
			public execute(): void {}
		}

		const world = new World();
		// We need to bypass the scheduleSystem check to test unscheduleSystem
		const invalidSystem = new InvalidSystem(0);
		(world as any).systems.set(InvalidSystem.name, invalidSystem);

		expect(() => world.unregisterSystem(InvalidSystem))
			.toThrowError("System InvalidSystem is neither an UpdateSystem nor a RenderSystem");
	});
});
