import { test, expect, suite, vi } from "vitest";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { Query } from "@/core/ecs/Query";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { EventBus } from "@/core/events/EventBus";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { Entity } from "@/core/ecs/Entity";

suite("ReactiveSystem Test Suite", () => {
	class TestReactiveSystem extends ReactiveSystem {
		public seen = 0;

		queries = {
			query: new Query({
				allowlist: [],
				blocklist: []
			})
		};

		public initialize(): void {
			this.subscribe("entityChanged", () => {
				this.seen++;
			});
		}
	}

	const dispatchChange = () => {
		const eventBus = ServiceRegistry.get<EventBus>(EventBus);
		eventBus.dispatch("entityChanged", { entity: new Entity("1337") });
		eventBus.processQueue();
	};

	test("ReactiveSystem extends UpdateSystem and runs its handlers on events", () => {
		const system = new TestReactiveSystem(0);

		expect(system.getPriority()).toBe(0);
		expect(system.isEnabled()).toBeTruthy();
		expect(system).toBeInstanceOf(UpdateSystem);

		dispatchChange();

		expect(system.seen).toBe(1);
		system.dispose();
	});

	test("ReactiveSystem execute method does nothing by default", () => {
		const system = new TestReactiveSystem(0);

		expect(() => system.execute(16, 1)).not.toThrow();

		const executeSpy = vi.spyOn(system, "execute");
		system.execute(16, 1);
		expect(executeSpy).toHaveBeenCalledWith(16, 1);
		system.dispose();
	});

	test("A disabled ReactiveSystem lets its events pass by", () => {
		const system = new TestReactiveSystem(5);

		system.disable();
		dispatchChange();
		expect(system.seen).toBe(0);

		system.enable();
		dispatchChange();
		expect(system.seen).toBe(1);
		system.dispose();
	});

	test("Disposing a ReactiveSystem drops its subscriptions", () => {
		const system = new TestReactiveSystem(0);

		system.dispose();
		dispatchChange();

		expect(system.seen).toBe(0);
	});

	test("ReactiveSystem can access queries", () => {
		const system = new TestReactiveSystem(0);

		expect(system.queries).toBeDefined();
		expect(system.queries.query).toBeInstanceOf(Query);
		system.dispose();
	});
});
