import { test, expect, suite, vi } from "vitest";
import { ReactiveUpdateSystem } from "@/core/ecs/ReactiveUpdateSystem";
import { Query } from "@/core/ecs/Query";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { EventSystem } from "@/core/events/EventSystem";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { Entity } from "@/core/ecs/Entity";

suite("ReactiveSystem Test Suite", () => {
	let entityChanged = false;

	class TestReactiveSystem extends ReactiveUpdateSystem {
		queries = {
			query: new Query({
				allowlist: [],
				blocklist: []
			})
		};

		public initialize(): void {
			this.eventSystem.subscribeOnce("entityChanged", () => {
				entityChanged = true;
			});
		}
	}

	test("ReactiveSystem extends UpdateSystem and has eventSystem", () => {
		const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem);
		const system = new TestReactiveSystem(0);

		expect(system).toBeDefined();
		expect(system.getPriority()).toBe(0);
		expect(system.isEnabled()).toBeTruthy();
		expect(system).toBeInstanceOf(UpdateSystem);

		eventSystem.dispatch("entityChanged", {
			entity: new Entity("1337")
		});
		eventSystem.processQueue();

		expect(entityChanged).toBeTruthy();
	});

	test("ReactiveSystem execute method does nothing by default", () => {
		const system = new TestReactiveSystem(0);

		// Execute should not throw and does nothing
		expect(() => system.execute(16, 1)).not.toThrow();

		// Verify it was called (even though it does nothing)
		const executeSpy = vi.spyOn(system, "execute");
		system.execute(16, 1);
		expect(executeSpy).toHaveBeenCalledWith(16, 1);
	});

	test("ReactiveSystem can be enabled and disabled", () => {
		const system = new TestReactiveSystem(5);

		expect(system.isEnabled()).toBeTruthy();

		system.disable();
		expect(system.isEnabled()).toBeFalsy();

		system.enable();
		expect(system.isEnabled()).toBeTruthy();
	});

	test("ReactiveSystem can access queries", () => {
		const system = new TestReactiveSystem(0);

		expect(system.queries).toBeDefined();
		expect(system.queries.query).toBeInstanceOf(Query);
	});
});
