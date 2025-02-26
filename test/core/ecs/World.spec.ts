import { test, expect, suite, vi } from "vitest";
import { World } from "../../../src/core/ecs/World";
import { Component } from "../../../src/core/ecs/Component";
import { GameError } from "../../../src/core/GameError";
import { GameState } from "../../../src/core/GameState";
import { EntityType } from "../../../src/core/ecs/Entity";
import { Query } from "../../../src/core/ecs/Query";
import { EventSystem } from "../../../src/core/events/EventSystem";
import { UpdateSystem } from "../../../src/core/ecs/UpdateSystem";
import { RenderSystem } from "../../../src/core/ecs/RenderSystem";

declare global {
    var world: World;
    var eventSystem: EventSystem;
}

suite("World Test Suite", () => {
    class PointComponent extends Component<{
        x: number;
        y: number;
    }> {}

    class JumpState extends GameState {
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
        const world = new World();
        globalThis.world = world;

        const eventSystem = new EventSystem();
        globalThis.eventSystem = eventSystem;

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
        }

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
        globalThis.world = world;

        const eventSystem = new EventSystem();
        globalThis.eventSystem = eventSystem;

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
        globalThis.world = world;

        const eventSystem = new EventSystem();
        globalThis.eventSystem = eventSystem;

        world.registerSystem(MovementSystem, 0);
        world.unregisterSystem(MovementSystem);

        expect(() => world.getSystem(MovementSystem)).toThrowError(GameError);

        const updateSystems = world.getUpdateSchedule();
        expect(updateSystems).toHaveLength(0);
    });

    test("World has a system", () => {
        const world = new World();
        world.registerSystem(MovementSystem, 0);

        expect(world.hasSystem(MovementSystem)).toBeTruthy();
        expect(world.hasSystem("MovementSystem")).toBeTruthy();
    });
});