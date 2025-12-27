import { test, expect, suite } from "vitest";
import { Component } from "@/core/ecs/Component";
import { World } from "@/core/ecs/World";
import { Query } from "@/core/ecs/Query";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { EventSystem } from "@/core/events/EventSystem";

suite("Query Test Suite", () => {
	class PointComponent extends Component<{
		x: number;
		y: number;
	}> {}

	class MoveComponent extends Component<{
		dx: number;
		dy: number;
	}> {}

	const world = ServiceRegistry.get<World>(World.name);
	const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem.name);
	world.registerComponent(PointComponent);
	world.registerComponent(MoveComponent);

	test("Query updates when entity changes", () => {
		const query = new Query({
			allowlist: ["PointComponent"],
			blocklist: ["MoveComponent"]
		});

		const entity = world.createEntity("1337");
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		const other = world.createEntity("4711");
		other.addComponent(PointComponent, { x: 10, y: 20 });
		other.addComponent(MoveComponent, { dx: 1, dy: 2 });

		eventSystem.processQueue();

		const results = query.getResult();
		expect(results[0].getID()).toEqual("1337");
	});

	test("Query all existing entities", () => {
		const entity = world.createEntity("7331");
		entity.addComponent(PointComponent, { x: 10, y: 20 });

		const other = world.createEntity("1147");
		other.addComponent(PointComponent, { x: 10, y: 20 });
		other.addComponent(MoveComponent, { dx: 1, dy: 2 });

		const otherQuery = new Query({
			allowlist: ["PointComponent"],
			blocklist: ["MoveComponent"]
		});

		eventSystem.processQueue();

		const results = otherQuery.getResult();
		expect(results[0].getID()).toEqual("1337");
		expect(results[1].getID()).toEqual("7331");
	});

	test("Query removes entity when component is added that is in blocklist", () => {
		const query = new Query({
			allowlist: ["PointComponent"],
			blocklist: ["MoveComponent"]
		});

		const entity = world.createEntity("remove-test-1");
		entity.addComponent(PointComponent, { x: 5, y: 5 });
		eventSystem.processQueue();

		let results = query.getResult();
		expect(results.some(e => e.getID() === "remove-test-1")).toBeTruthy();

		// Add a component from the blocklist - entity should be removed from query
		entity.addComponent(MoveComponent, { dx: 1, dy: 1 });
		eventSystem.processQueue();

		results = query.getResult();
		expect(results.some(e => e.getID() === "remove-test-1")).toBeFalsy();

		query.dispose();
	});

	test("Query removes entity when entity is removed from world", () => {
		const query = new Query({
			allowlist: ["PointComponent"]
		});

		const entity = world.createEntity("remove-test-2");
		entity.addComponent(PointComponent, { x: 3, y: 3 });
		eventSystem.processQueue();

		let results = query.getResult();
		expect(results.some(e => e.getID() === "remove-test-2")).toBeTruthy();

		// Remove entity from world - should trigger onEntityRemoved
		world.unregisterEntity(entity);
		eventSystem.processQueue();

		results = query.getResult();
		expect(results.some(e => e.getID() === "remove-test-2")).toBeFalsy();

		query.dispose();
	});

	test("Query getSingleResult returns first entity or null", () => {
		const query = new Query({
			allowlist: ["PointComponent"],
			blocklist: ["MoveComponent"]
		});

		eventSystem.processQueue();

		// Should return first entity
		const singleResult = query.getSingleResult();
		expect(singleResult).not.toBeNull();
		expect(singleResult?.getID()).toEqual("1337");

		// Test with empty query
		const emptyQuery = new Query({
			allowlist: ["NonExistentComponent"]
		});

		const noResult = emptyQuery.getSingleResult();
		expect(noResult).toBeNull();

		query.dispose();
		emptyQuery.dispose();
	});

	test("Query onEntityRemoved when entity is not in query (else branch)", () => {
		// Create a query that only matches PointComponent
		const query = new Query({
			allowlist: ["PointComponent"]
		});

		// Create an entity that DOESN'T match the query
		const entity = world.createEntity("non-matching-entity");
		entity.addComponent(MoveComponent, { dx: 5, dy: 5 });
		eventSystem.processQueue();

		// Verify entity is NOT in the query
		let results = query.getResult();
		expect(results.some(e => e.getID() === "non-matching-entity")).toBeFalsy();

		// Now remove the entity - this triggers onEntityRemoved
		// Since entity is not in query, exists will be false
		world.unregisterEntity(entity);
		eventSystem.processQueue();

		// Query should still not contain it (nothing should change)
		results = query.getResult();
		expect(results.some(e => e.getID() === "non-matching-entity")).toBeFalsy();

		query.dispose();
	});
});
