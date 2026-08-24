import { test, expect, suite, afterEach } from "vitest";
import { World } from "@/core/ecs/World";
import { Entity } from "@/core/ecs/Entity";
import { Component } from "@/core/ecs/Component";
import { GameError } from "@/core/GameError";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { TransformComponent, TransformData } from "@/core/ecs/components/TransformComponent";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";

suite("TransformSystem Test Suite", () => {
	class MarkerComponent extends Component<Record<string, never>> {
		public static readonly type = "marker";
	}

	const world = ServiceRegistry.get<World>(World.name);

	world.registerComponent(TransformComponent);
	world.registerComponent(MarkerComponent);

	const created: Entity[] = [];

	const makeEntity = (id: string, transform?: Partial<TransformData>): Entity => {
		const entity = world.createEntity(id);
		created.push(entity);

		if (transform) {
			entity.addComponent(TransformComponent, transform as TransformData);
		}

		return entity;
	};

	afterEach(() => {
		for (const entity of created) {
			world.unregisterEntity(entity);
		}

		created.length = 0;
	});

	test("Resolves a root transform to its local position", () => {
		const entity = makeEntity("root", { x: 30, y: 40 });

		const system = new TransformSystem(0);
		system.execute();

		const position = system.getWorldPosition(entity);

		expect(position?.x).toBe(30);
		expect(position?.y).toBe(40);
	});

	test("Child transform is relative to its parent", () => {
		const parent = makeEntity("parent", { x: 100, y: 50 });
		const child = makeEntity("child", { x: 10, y: 5, parent: parent.getID() });

		const system = new TransformSystem(0);
		system.execute();

		const position = system.getWorldPosition(child);

		expect(position?.x).toBe(110);
		expect(position?.y).toBe(55);
	});

	test("Parent rotation composes into the child world transform", () => {
		const parent = makeEntity("parent", { rotation: 90 });
		const child = makeEntity("child", { x: 10, parent: parent.getID() });

		const system = new TransformSystem(0);
		system.execute();

		const position = system.getWorldPosition(child);

		expect(position?.x).approximately(0, 0.0001);
		expect(position?.y).approximately(10, 0.0001);
	});

	test("Child is resolved even when it precedes its parent", () => {
		const child = makeEntity("child", { x: 10, parent: "parent" });
		const parent = makeEntity("parent", { x: 100 });

		const system = new TransformSystem(0);
		system.execute();

		expect(system.getWorldPosition(child)?.x).toBe(110);
		expect(system.getWorldPosition(parent)?.x).toBe(100);
	});

	test("Unknown parent is treated as a root transform", () => {
		const entity = makeEntity("orphan", { x: 7, parent: "does-not-exist" });

		const system = new TransformSystem(0);
		system.execute();

		expect(system.getWorldPosition(entity)?.x).toBe(7);
	});

	test("Parent without a transform is treated as a root transform", () => {
		const parent = makeEntity("plain");
		parent.addComponent(MarkerComponent, {});

		const entity = makeEntity("child", { x: 7, parent: parent.getID() });

		const system = new TransformSystem(0);
		system.execute();

		expect(system.getWorldPosition(entity)?.x).toBe(7);
	});

	test("Cyclic hierarchy is reported instead of hanging", () => {
		makeEntity("a", { parent: "b" });
		makeEntity("b", { parent: "a" });

		const system = new TransformSystem(0);

		expect(() => system.execute()).toThrowError(GameError);
	});

	test("Entities without a transform have no world matrix", () => {
		const system = new TransformSystem(0);
		system.execute();

		expect(system.getWorldMatrix("nothing-here")).toBeNull();
		expect(system.getWorldPosition("nothing-here")).toBeNull();
	});
});
