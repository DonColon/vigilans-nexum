import { test, expect, suite, vi, beforeEach } from "vitest";
import { EventBus } from "@/core/events/EventBus";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { BundleLoadedEvent } from "@/core/assets/BundleEvents";
import { Entity } from "@/core/ecs/Entity";

suite("EventBus Test Suite", () => {
	let eventBus: EventBus;

	beforeEach(() => {
		eventBus = ServiceRegistry.get<EventBus>(EventBus);
	});

	test("Subscribe event handler to an event", () => {
		const handler = () => {};
		eventBus.subscribe("bundleLoaded", handler);

		const subscribers = eventBus.getSubscribers("bundleLoaded");
		expect(subscribers[0].handler).toBe(handler);
		expect(subscribers).toHaveLength(1);

		eventBus.unsubscribe("bundleLoaded", handler);
	});

	test("Subscribe multiple handlers with different priorities", () => {
		const handler1 = vi.fn();
		const handler2 = vi.fn();
		const handler3 = vi.fn();

		eventBus.subscribe("bundleLoaded", handler1, 1);
		eventBus.subscribe("bundleLoaded", handler2, 10);
		eventBus.subscribe("bundleLoaded", handler3, 5);

		const subscribers = eventBus.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(3);
		expect(subscribers[0].priority).toBe(10);
		expect(subscribers[1].priority).toBe(5);
		expect(subscribers[2].priority).toBe(1);

		eventBus.unsubscribe("bundleLoaded", handler1);
		eventBus.unsubscribe("bundleLoaded", handler2);
		eventBus.unsubscribe("bundleLoaded", handler3);
	});

	test("Subscribe returns unsubscribe function", () => {
		const handler = vi.fn();
		const unsubscribe = eventBus.subscribe("bundleLoaded", handler);

		expect(eventBus.getSubscribers("bundleLoaded")).toHaveLength(1);

		unsubscribe();

		expect(eventBus.getSubscribers("bundleLoaded")).toHaveLength(0);
	});

	test("SubscribeOnce calls handler only once", () => {
		const handler = vi.fn();

		eventBus.subscribeOnce("bundleLoaded", handler, 5);

		eventBus.dispatch("bundleLoaded", {
			bundle: "Test1",
			failed: 0,
			loaded: 1
		});
		eventBus.processQueue();

		eventBus.dispatch("bundleLoaded", {
			bundle: "Test2",
			failed: 0,
			loaded: 1
		});
		eventBus.processQueue();

		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("Unsubscribe event handler from an event", () => {
		const handler = () => {};

		let subscribers = eventBus.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(0);

		eventBus.subscribe("bundleLoaded", handler);
		eventBus.unsubscribe("bundleLoaded", handler);

		subscribers = eventBus.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(0);
	});

	test("Unsubscribe from non-existent event does not throw", () => {
		const handler = () => {};

		expect(() => {
			eventBus.unsubscribe("entityChanged", handler);
		}).not.toThrow();
	});

	test("Dispatch event to event handler", () => {
		const handler = vi.fn((event: BundleLoadedEvent) => {
			expect(event.bundle).toBe("StartMenu");
			expect(event.failed).toBe(0);
			expect(event.loaded).toBe(1);
			expect(event.type).toBe("bundleLoaded");
			expect(event.timestamp).toBeGreaterThan(0);
		});

		eventBus.subscribe("bundleLoaded", handler);
		eventBus.dispatch("bundleLoaded", {
			bundle: "StartMenu",
			failed: 0,
			loaded: 1
		});
		eventBus.processQueue();

		expect(handler).toHaveBeenCalledTimes(1);
		eventBus.unsubscribe("bundleLoaded", handler);
	});

	test("Stop propagation prevents further handlers", () => {
		const handler1 = vi.fn((event: BundleLoadedEvent) => {
			event.stopPropagation();
		});
		const handler2 = vi.fn();

		eventBus.subscribe("bundleLoaded", handler1, 10);
		eventBus.subscribe("bundleLoaded", handler2, 5);

		eventBus.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});
		eventBus.processQueue();

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).not.toHaveBeenCalled();

		eventBus.unsubscribe("bundleLoaded", handler1);
		eventBus.unsubscribe("bundleLoaded", handler2);
	});

	test("Error in handler does not break event processing", () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const handler1 = vi.fn(() => {
			throw new Error("Test error");
		});
		const handler2 = vi.fn();

		eventBus.subscribe("bundleLoaded", handler1);
		eventBus.subscribe("bundleLoaded", handler2);

		eventBus.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});
		eventBus.processQueue();

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
		eventBus.unsubscribe("bundleLoaded", handler1);
		eventBus.unsubscribe("bundleLoaded", handler2);
	});

	test("ProcessQueue processes all queued events", () => {
		const handler = vi.fn();

		eventBus.subscribe("bundleLoaded", handler);

		eventBus.dispatch("bundleLoaded", {
			bundle: "Test1",
			failed: 0,
			loaded: 1
		});
		eventBus.dispatch("bundleLoaded", {
			bundle: "Test2",
			failed: 0,
			loaded: 2
		});

		expect(handler).not.toHaveBeenCalled();

		eventBus.processQueue();

		expect(handler).toHaveBeenCalledTimes(2);

		eventBus.unsubscribe("bundleLoaded", handler);
	});

	test("EnableHistory and disableHistory control history recording", () => {
		eventBus.enableHistory();

		const handler = vi.fn();
		eventBus.subscribe("bundleLoaded", handler);

		eventBus.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});
		eventBus.processQueue();

		eventBus.disableHistory();

		eventBus.unsubscribe("bundleLoaded", handler);
	});

	test("PrintEventStatistics calls history.printStatistics", () => {
		const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});

		eventBus.printEventStatistics();

		expect(consoleTableSpy).toHaveBeenCalled();

		consoleTableSpy.mockRestore();
	});

	test("GetSubscribers returns empty array for non-existent event", () => {
		const subscribers = eventBus.getSubscribers("entityChanged");
		expect(subscribers).toEqual([]);
	});

	test("Dispatch event with no subscribers processes without error", () => {
		expect(() => {
			eventBus.dispatch("entityChanged", {
				entity: new Entity("42")
			});
			eventBus.processQueue();
		}).not.toThrow();
	});

	test("ProcessEvent handles events with no subscribers", () => {
		const handler = vi.fn();

		eventBus.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});

		eventBus.processQueue();

		expect(handler).not.toHaveBeenCalled();
	});
});
