import { test, expect, suite, vi, beforeEach } from "vitest";
import { EventSystem } from "@/core/events/EventSystem";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { BundleLoadedEvent } from "@/core/assets/BundleEvents";
import { Entity } from "@/core/ecs/Entity";

suite("EventSystem Test Suite", () => {
	let eventSystem: EventSystem;

	beforeEach(() => {
		eventSystem = ServiceRegistry.get<EventSystem>(EventSystem);
	});

	test("Subscribe event handler to an event", () => {
		const handler = () => {};
		eventSystem.subscribe("bundleLoaded", handler);

		const subscribers = eventSystem.getSubscribers("bundleLoaded");
		expect(subscribers[0].handler).toBe(handler);
		expect(subscribers).toHaveLength(1);

		eventSystem.unsubscribe("bundleLoaded", handler);
	});

	test("Subscribe multiple handlers with different priorities", () => {
		const handler1 = vi.fn();
		const handler2 = vi.fn();
		const handler3 = vi.fn();

		eventSystem.subscribe("bundleLoaded", handler1, 1);
		eventSystem.subscribe("bundleLoaded", handler2, 10);
		eventSystem.subscribe("bundleLoaded", handler3, 5);

		const subscribers = eventSystem.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(3);
		expect(subscribers[0].priority).toBe(10);
		expect(subscribers[1].priority).toBe(5);
		expect(subscribers[2].priority).toBe(1);

		eventSystem.unsubscribe("bundleLoaded", handler1);
		eventSystem.unsubscribe("bundleLoaded", handler2);
		eventSystem.unsubscribe("bundleLoaded", handler3);
	});

	test("Subscribe returns unsubscribe function", () => {
		const handler = vi.fn();
		const unsubscribe = eventSystem.subscribe("bundleLoaded", handler);

		expect(eventSystem.getSubscribers("bundleLoaded")).toHaveLength(1);

		unsubscribe();

		expect(eventSystem.getSubscribers("bundleLoaded")).toHaveLength(0);
	});

	test("SubscribeOnce calls handler only once", () => {
		const handler = vi.fn();

		eventSystem.subscribeOnce("bundleLoaded", handler, 5);

		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test1",
			failed: 0,
			loaded: 1
		});
		eventSystem.processQueue();

		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test2",
			failed: 0,
			loaded: 1
		});
		eventSystem.processQueue();

		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("Unsubscribe event handler from an event", () => {
		const handler = () => {};

		let subscribers = eventSystem.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(0);

		eventSystem.subscribe("bundleLoaded", handler);
		eventSystem.unsubscribe("bundleLoaded", handler);

		subscribers = eventSystem.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(0);
	});

	test("Unsubscribe from non-existent event does not throw", () => {
		const handler = () => {};

		expect(() => {
			eventSystem.unsubscribe("entityChanged", handler);
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

		eventSystem.subscribe("bundleLoaded", handler);
		eventSystem.dispatch("bundleLoaded", {
			bundle: "StartMenu",
			failed: 0,
			loaded: 1
		});
		eventSystem.processQueue();

		expect(handler).toHaveBeenCalledTimes(1);
		eventSystem.unsubscribe("bundleLoaded", handler);
	});

	test("Stop propagation prevents further handlers", () => {
		const handler1 = vi.fn((event: BundleLoadedEvent) => {
			event.stopPropagation();
		});
		const handler2 = vi.fn();

		eventSystem.subscribe("bundleLoaded", handler1, 10);
		eventSystem.subscribe("bundleLoaded", handler2, 5);

		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});
		eventSystem.processQueue();

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).not.toHaveBeenCalled();

		eventSystem.unsubscribe("bundleLoaded", handler1);
		eventSystem.unsubscribe("bundleLoaded", handler2);
	});

	test("Error in handler does not break event processing", () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const handler1 = vi.fn(() => {
			throw new Error("Test error");
		});
		const handler2 = vi.fn();

		eventSystem.subscribe("bundleLoaded", handler1);
		eventSystem.subscribe("bundleLoaded", handler2);

		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});
		eventSystem.processQueue();

		expect(handler1).toHaveBeenCalledTimes(1);
		expect(handler2).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
		eventSystem.unsubscribe("bundleLoaded", handler1);
		eventSystem.unsubscribe("bundleLoaded", handler2);
	});

	test("ProcessQueue processes all queued events", () => {
		const handler = vi.fn();

		eventSystem.subscribe("bundleLoaded", handler);

		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test1",
			failed: 0,
			loaded: 1
		});
		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test2",
			failed: 0,
			loaded: 2
		});

		expect(handler).not.toHaveBeenCalled();

		eventSystem.processQueue();

		expect(handler).toHaveBeenCalledTimes(2);

		eventSystem.unsubscribe("bundleLoaded", handler);
	});

	test("EnableHistory and disableHistory control history recording", () => {
		eventSystem.enableHistory();

		const handler = vi.fn();
		eventSystem.subscribe("bundleLoaded", handler);

		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});
		eventSystem.processQueue();

		eventSystem.disableHistory();

		eventSystem.unsubscribe("bundleLoaded", handler);
	});

	test("PrintEventStatistics calls history.printStatistics", () => {
		const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});

		eventSystem.printEventStatistics();

		expect(consoleTableSpy).toHaveBeenCalled();

		consoleTableSpy.mockRestore();
	});

	test("GetSubscribers returns empty array for non-existent event", () => {
		const subscribers = eventSystem.getSubscribers("entityChanged");
		expect(subscribers).toEqual([]);
	});

	test("Dispatch event with no subscribers processes without error", () => {
		expect(() => {
			eventSystem.dispatch("entityChanged", {
				entity: new Entity("42")
			});
			eventSystem.processQueue();
		}).not.toThrow();
	});

	test("ProcessEvent handles events with no subscribers", () => {
		const handler = vi.fn();

		eventSystem.dispatch("bundleLoaded", {
			bundle: "Test",
			failed: 0,
			loaded: 1
		});

		eventSystem.processQueue();

		expect(handler).not.toHaveBeenCalled();
	});
});
