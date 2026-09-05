import { test, expect, suite, beforeEach, vi } from "vitest";
import { EventHistory } from "@/core/events/EventHistory";

suite("EventHistory Test Suite", () => {
	let history: EventHistory;

	beforeEach(() => {
		history = new EventHistory({ maxSize: 10, enabled: true });
	});

	test("Record adds event to history when enabled", () => {
		const event = {
			type: "bundleLoaded" as const,
			timestamp: Date.now(),
			bundle: "Test",
			failed: 0,
			loaded: 1,
			stopPropagation: () => {},
			isPropagationStopped: () => false
		};

		history.record(event, 2, 5.5);

		expect(history.size()).toBe(1);
	});

	test("Record does not add event when disabled", () => {
		history.disable();

		const event = {
			type: "bundleLoaded" as const,
			timestamp: Date.now(),
			bundle: "Test",
			failed: 0,
			loaded: 1,
			stopPropagation: () => {},
			isPropagationStopped: () => false
		};

		history.record(event, 2, 5.5);

		expect(history.size()).toBe(0);
	});

	test("Enable and disable control history recording", () => {
		expect(history.isEnabled()).toBe(true);

		history.disable();
		expect(history.isEnabled()).toBe(false);

		history.enable();
		expect(history.isEnabled()).toBe(true);
	});

	test("History respects maxSize limit", () => {
		const smallHistory = new EventHistory({ maxSize: 3, enabled: true });

		for (let i = 0; i < 5; i++) {
			smallHistory.record(
				{
					type: "bundleLoaded",
					timestamp: Date.now(),
					stopPropagation: () => {},
					isPropagationStopped: () => false
				},
				1,
				1
			);
		}

		expect(smallHistory.size()).toBe(3);
	});

	test("GetStatistics returns event statistics", () => {
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

		history.record(event1, 2, 10);
		history.record(event2, 3, 20);

		const stats = history.getStatistics();

		expect(stats).toHaveLength(1);
		expect(stats[0].type).toBe("bundleLoaded");
		expect(stats[0].count).toBe(2);
		expect(stats[0].totalSubscribers).toBe(5);
		expect(stats[0].totalProcessingTime).toBe(30);
		expect(stats[0].averageProcessingTime).toBe(15);
		expect(stats[0].stopped).toBe(0);
	});

	test("GetStatistics tracks stopped events", () => {
		let stoppedFlag = false;

		const event = {
			type: "bundleLoaded" as const,
			timestamp: Date.now(),
			bundle: "Test",
			failed: 0,
			loaded: 1,
			stopPropagation: () => {
				stoppedFlag = true;
			},
			isPropagationStopped: () => stoppedFlag
		};

		event.stopPropagation();
		history.record(event, 1, 5);

		const stats = history.getStatistics();

		expect(stats[0].stopped).toBe(1);
	});

	test("GetEvent filters events by name", () => {
		history.record(
			{
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			5
		);

		history.record(
			{
				type: "entityChanged",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			5
		);

		const bundleEvents = history.getEvent("bundleLoaded");
		expect(bundleEvents).toHaveLength(1);
		expect(bundleEvents[0].event.type).toBe("bundleLoaded");
	});

	test("GetRecent returns last N events", () => {
		for (let i = 0; i < 5; i++) {
			history.record(
				{
					type: "bundleLoaded",
					timestamp: Date.now(),
					stopPropagation: () => {},
					isPropagationStopped: () => false
				},
				1,
				1
			);
		}

		const recent = history.getRecent(2);
		expect(recent).toHaveLength(2);
	});

	test("GetSlowEvents filters by processing time threshold", () => {
		history.record(
			{
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			5
		);

		history.record(
			{
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			50
		);

		const slowEvents = history.getSlowEvents(10);
		expect(slowEvents).toHaveLength(1);
		expect(slowEvents[0].processingTime).toBe(50);
	});

	test("GetStoppedEvents filters stopped events", () => {
		let stopped = false;

		history.record(
			{
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			5
		);

		const stoppedEvent = {
			type: "bundleLoaded" as const,
			timestamp: Date.now(),
			bundle: "Stopped",
			failed: 0,
			loaded: 1,
			stopPropagation: () => {
				stopped = true;
			},
			isPropagationStopped: () => stopped
		};
		stoppedEvent.stopPropagation();

		history.record(stoppedEvent, 1, 5);

		const stoppedEvents = history.getStoppedEvents();
		expect(stoppedEvents).toHaveLength(1);
		expect(stoppedEvents[0].wasStopped).toBe(true);
	});

	test("GetHistory returns copy of all records", () => {
		history.record(
			{
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			5
		);

		const allRecords = history.getHistory();
		expect(allRecords).toHaveLength(1);

		allRecords.push({
			event: {
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			subscriberCount: 1,
			processingTime: 5,
			wasStopped: false
		});

		expect(history.size()).toBe(1);
	});

	test("Clear empties the history", () => {
		history.record(
			{
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			5
		);

		expect(history.size()).toBe(1);

		history.clear();

		expect(history.size()).toBe(0);
	});

	test("PrintStatistics calls console.table", () => {
		const consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});

		history.record(
			{
				type: "bundleLoaded",
				timestamp: Date.now(),
				stopPropagation: () => {},
				isPropagationStopped: () => false
			},
			1,
			5
		);

		history.printStatistics();

		expect(consoleTableSpy).toHaveBeenCalled();

		consoleTableSpy.mockRestore();
	});
});
