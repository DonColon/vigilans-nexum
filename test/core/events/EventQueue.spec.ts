import { test, expect, suite, beforeEach } from "vitest";
import { EventQueue } from "@/core/events/EventQueue";

suite("EventQueue Test Suite", () => {
	let queue: EventQueue;

	beforeEach(() => {
		queue = new EventQueue();
	});

	test("Enqueue adds events to queue", () => {
		expect(queue.isEmpty).toBe(true);
		expect(queue.size).toBe(0);

		queue.enqueue({
			type: "bundleLoaded",
			timestamp: Date.now(),
			bundle: "Test",
			failed: 0,
			loaded: 1,
			stopPropagation: () => {},
			isPropagationStopped: () => false
		});

		expect(queue.isEmpty).toBe(false);
		expect(queue.size).toBe(1);
	});

	test("Peek returns first event without removing it", () => {
		const event = {
			type: "bundleLoaded" as const,
			timestamp: Date.now(),
			bundle: "Test",
			failed: 0,
			loaded: 1,
			stopPropagation: () => {},
			isPropagationStopped: () => false
		};

		queue.enqueue(event);

		const peeked = queue.peek();
		expect(peeked).toBe(event);
		expect(queue.size).toBe(1);
	});

	test("Peek returns undefined for empty queue", () => {
		expect(queue.peek()).toBeUndefined();
	});

	test("DequeueAll returns all events and clears queue", () => {
		const event1 = {
			type: "bundleLoaded" as const,
			timestamp: Date.now(),
			bundle: "Test1",
			failed: 0,
			loaded: 1,
			stopPropagation: () => {},
			isPropagationStopped: () => false
		};

		const event2 = {
			type: "bundleLoaded" as const,
			timestamp: Date.now(),
			bundle: "Test2",
			failed: 0,
			loaded: 2,
			stopPropagation: () => {},
			isPropagationStopped: () => false
		};

		queue.enqueue(event1);
		queue.enqueue(event2);

		expect(queue.size).toBe(2);

		const events = queue.dequeueAll();

		expect(events).toHaveLength(2);
		expect(events[0]).toBe(event1);
		expect(events[1]).toBe(event2);
		expect(queue.isEmpty).toBe(true);
		expect(queue.size).toBe(0);
	});
});
