import { test, expect, suite } from "vitest";
import { Entity } from "../../../src/core/ecs/Entity";
import { Component } from "../../../src/core/ecs/Component";
import { World } from "../../../src/core/ecs/World";
import { EventSystem } from "../../../src/core/events/EventSystem";
import { GameState } from "../../../src/core/GameState";
import { GameStateManager } from "../../../src/core/GameStateManager";
import { GameError } from "../../../src/core/GameError";

declare global {
	var world: World;
	var eventSystem: EventSystem;
}

suite("Entity Test Suite", () => {
	const world = new World();
	globalThis.world = world;

	const eventSystem = new EventSystem();
	globalThis.eventSystem = eventSystem;

	class PointComponent extends Component<{
		x: number;
		y: number;
	}> {}

	class MoveComponent extends Component<{
		dx: number;
		dy: number;
	}> {}

	class ImageComponent extends Component<{
		src: string;
	}> {}

	class JumpState extends GameState {
		onEnter() {}
		onExit() {}
	}

	class FallState extends GameState {
		onEnter() {}
		onExit() {}
	}

	world.registerComponent(PointComponent);
	world.registerEntityState(JumpState);

	test("Add a component to an entity", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		const component = entity.getComponent(PointComponent);
		expect(component.toObject()).toEqual({ x: 10, y: 20 });
		expect(component).toBeDefined();

		expect(() => entity.addComponent(MoveComponent, { dx: 1, dy: 2 })).toThrowError(GameError);
	});

	test("Remove a component from an entity", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });
		entity.removeComponent(PointComponent);

		expect(() => entity.getComponent(PointComponent)).toThrowError(GameError);
	});

	test("Get a component from an entity", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		const component = entity.getComponent(PointComponent);
		expect(component.toObject()).toEqual({ x: 10, y: 20 });
	});

	test("Get component data from an entity", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		const data = entity.getComponentData(PointComponent);
		expect(data).toEqual({ x: 10, y: 20 });
	});

	test("Check if an entity has a component", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		expect(entity.hasComponent(PointComponent)).toBeTruthy();
		expect(entity.hasComponent("PointComponent")).toBeTruthy();
		expect(entity.hasComponent(MoveComponent)).toBeFalsy();
		expect(entity.hasComponent("MoveComponent")).toBeFalsy();
	});

	test("Check if an entity has all components", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		expect(entity.hasAllComponents(["PointComponent"])).toBeTruthy();
		expect(entity.hasAllComponents(["PointComponent", "MoveComponent", "ImageComponent"])).toBeFalsy();
	});

	test("Check if an entity has any components", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		expect(entity.hasAnyComponents(["PointComponent"])).toBeTruthy();
		expect(entity.hasAnyComponents(["MoveComponent", "ImageComponent"])).toBeFalsy();
	});

	test("Manage state of an entity", () => {
		const entity = new Entity();
		const stateManager: GameStateManager = entity.getStateManager();

		entity.addState(JumpState);
		let registeredStates = stateManager.getRegisteredStates();
		expect(registeredStates[0]).toBeInstanceOf(JumpState);

		expect(() => entity.addState(FallState)).toThrowError(GameError);

		entity.removeState(JumpState);
		registeredStates = stateManager.getRegisteredStates();
		expect(registeredStates).toHaveLength(0);
	});

	test("Reset components of an entity", () => {
		const entity = new Entity();
		entity.addComponent(PointComponent, { x: 10, y: 20 });
		entity.reset();

		expect(() => entity.getComponent(PointComponent)).toThrowError(GameError);
	});

	test("Get entity as an object", () => {
		const entity = new Entity("1337");
		entity.addComponent(PointComponent, { x: 10, y: 20 });
		entity.addState(JumpState);
		
		const stateManager = entity.getStateManager();
		stateManager.push(JumpState);

		const entityID = entity.getID();
		expect(entityID).toEqual("1337");

		const object = entity.toObject();
		expect(object).toEqual({
			id: "1337",
			components: {
				PointComponent: { x: 10, y: 20 }
			},
			states: ["JumpState"],
			enabled: true
		});
	});

	test("Get entity as a JSON string", () => {
		const entity = new Entity("1337");
		entity.addComponent(PointComponent, { x: 10, y: 20 });
		entity.addState(JumpState);
		
		const stateManager = entity.getStateManager();
		stateManager.push(JumpState);

		const json = entity.toString();
		expect(json).toEqual('{\n\t"id": "1337",\n\t"enabled": true,\n\t"states": [\n\t\t"JumpState"\n\t],\n\t"components": {\n\t\t"PointComponent": {\n\t\t\t"x": 10,\n\t\t\t"y": 20\n\t\t}\n\t}\n}');
	});

	test("Parse an entity from an object", () => {
		let entity = Entity.parse({
			id: "1337",
			components: {
				PointComponent: { x: 10, y: 20 }
			},
			states: ["JumpState"],
			enabled: true
		});

		expect(entity.getID()).toEqual("1337");
		expect(entity.getComponentData(PointComponent)).toEqual({ x: 10, y: 20 });

		entity = Entity.parse('{"id":"1337","enabled":true,"states":["JumpState"],"components":{"PointComponent":{"x":10,"y":20}}}');
		expect(entity.getID()).toEqual("1337");
		expect(entity.getComponentData(PointComponent)).toEqual({ x: 10, y: 20 });
	});

	test("Enable and disable an entity", () => {
		const entity = new Entity();
		entity.disable();
		expect(entity.isEnabled()).toBeFalsy();

		entity.enable();
		expect(entity.isEnabled()).toBeTruthy();
	});
});
