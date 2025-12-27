import { test, expect, suite } from "vitest";
import { EventSystem } from "../../../src/core/events/EventSystem";
import { ServiceRegistry } from "../../../src/core/service/ServiceRegistry";
import { BundleLoadedEvent } from "../../../src/core/assets/BundleEvents";

declare global {
	var eventSystem: EventSystem;
}

suite("EventSystem Test Suite", () => {
	test("Subscribe event handler to an event", () => {
		const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem);
		globalThis.eventSystem = eventSystem;

		const handler = () => {};
		eventSystem.subscribe("bundleLoaded", handler);

		const subscribers = eventSystem.getSubscribers("bundleLoaded");
		expect(subscribers[0].handler).toBe(handler);
		expect(subscribers).toHaveLength(1);

		// Cleanup: unsubscribe to not affect other tests
		eventSystem.unsubscribe("bundleLoaded", handler);
	});

	test("Unsubscribe event handler from an event", () => {
		const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem);
		globalThis.eventSystem = eventSystem;

		const handler = () => {};

		let subscribers = eventSystem.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(0);


		eventSystem.subscribe("bundleLoaded", handler);
		eventSystem.unsubscribe("bundleLoaded", handler);

		subscribers = eventSystem.getSubscribers("bundleLoaded");
		expect(subscribers).toHaveLength(0);
	});

	test("Dispatch event to event handler", () => {
		const eventSystem = ServiceRegistry.get<EventSystem>(EventSystem);
		globalThis.eventSystem = eventSystem;

		const handler = (event: BundleLoadedEvent) => {
			expect(event.bundle).toBe("StartMenu");
			expect(event.failed).toBe(0);
			expect(event.loaded).toBe(1);
		};

		eventSystem.subscribe("bundleLoaded", handler);
		eventSystem.dispatch("bundleLoaded", {
			bundle: "StartMenu",
			failed: 0,
			loaded: 1,
		});
	});
});
