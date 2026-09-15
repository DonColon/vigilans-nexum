import { test, expect, suite } from "vitest";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { ScheduledSystem } from "@/core/ecs/ScheduledSystem";
import { Query } from "@/core/ecs/Query";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { EventBus } from "@/core/events/EventBus";
import { System } from "@/core/ecs/System";
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

	const eventBus = ServiceRegistry.get<EventBus>(EventBus);

	const dispatchChange = () => {
		eventBus.dispatch("entityChanged", { entity: new Entity("1337") });
		eventBus.processQueue();
	};

	test("A ReactiveSystem is a System with no schedule: built with nothing, no priority, no execute", () => {
		const system = new TestReactiveSystem();

		expect(system).toBeInstanceOf(System);
		expect(system).not.toBeInstanceOf(ScheduledSystem);
		expect("getPriority" in system).toBe(false);
		expect("execute" in system).toBe(false);
		expect(system.isEnabled()).toBeTruthy();

		dispatchChange();

		expect(system.seen).toBe(1);
		system.dispose();
	});

	test("Order among the handlers of one event is said on the subscription, higher first", () => {
		const order: string[] = [];

		class FirstSystem extends ReactiveSystem {
			public initialize(): void {
				this.subscribe("entityChanged", () => order.push("first"), 10);
			}
		}

		class LastSystem extends ReactiveSystem {
			public initialize(): void {
				this.subscribe("entityChanged", () => order.push("last"), -10);
			}
		}

		// Registered last, runs first - the subscription's priority decides, not the order of creation.
		const last = new LastSystem();
		const first = new FirstSystem();

		dispatchChange();

		expect(order).toStrictEqual(["first", "last"]);
		first.dispose();
		last.dispose();
	});

	test("A disabled ReactiveSystem lets its events pass by", () => {
		const system = new TestReactiveSystem();

		system.disable();
		dispatchChange();
		expect(system.seen).toBe(0);

		system.enable();
		dispatchChange();
		expect(system.seen).toBe(1);
		system.dispose();
	});

	test("Disposing a ReactiveSystem drops its subscriptions", () => {
		const system = new TestReactiveSystem();

		system.dispose();
		dispatchChange();

		expect(system.seen).toBe(0);
	});

	test("ReactiveSystem can access queries", () => {
		const system = new TestReactiveSystem();

		expect(system.queries).toBeDefined();
		expect(system.queries.query).toBeInstanceOf(Query);
		system.dispose();
	});
});
