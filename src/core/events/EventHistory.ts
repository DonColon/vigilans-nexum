import { EventNames } from "@/core/events/GameEvents";
import { GameEvent } from "@/core/events/GameEvent";

export interface EventRecord {
	event: GameEvent;
	subscriberCount: number;
	processingTime: number;
	wasStopped: boolean;
}

export interface EventStatistics {
	type: EventNames;
	count: number;
	totalSubscribers: number;
	totalProcessingTime: number;
	averageProcessingTime: number;
	stopped: number;
}

export interface EventHistoryConfig {
	maxSize: number;
	enabled: boolean;
}

export class EventHistory {
	private readonly history: EventRecord[];
	private readonly maxSize: number;
	private enabled: boolean;

	constructor(config: EventHistoryConfig) {
		this.history = [];
		this.maxSize = config.maxSize;
		this.enabled = config.enabled;
	}

	public record(event: GameEvent, subscriberCount: number, processingTime: number) {
		if (!this.enabled) return;

		const record: EventRecord = {
			event: { ...event },
			subscriberCount,
			processingTime,
			wasStopped: event.isPropagationStopped()
		};

		this.history.push(record);

		if (this.history.length > this.maxSize) {
			this.history.shift();
		}
	}

	public getStatistics(): EventStatistics[] {
		const eventTypes = new Map<EventNames, EventStatistics>();

		for (const record of this.history) {
			const type = record.event.type;
			const existing = eventTypes.get(type) || {
				type: record.event.type,
				count: 0,
				totalSubscribers: 0,
				totalProcessingTime: 0,
				averageProcessingTime: 0,
				stopped: 0
			};

			existing.count++;
			existing.totalProcessingTime += record.processingTime;
			existing.totalSubscribers += record.subscriberCount;
			if (record.wasStopped) existing.stopped++;

			eventTypes.set(type, existing);
		}

		const statistics: EventStatistics[] = [];

		for (const [type, stats] of eventTypes) {
			statistics.push({
				type,
				count: stats.count,
				totalSubscribers: stats.totalSubscribers,
				totalProcessingTime: stats.totalProcessingTime,
				averageProcessingTime: stats.totalProcessingTime / stats.count,
				stopped: stats.stopped
			});
		}

		return statistics;
	}

	public printStatistics() {
		const statistics = this.getStatistics();
		console.table(statistics);
	}

	public getEvent(eventName: EventNames): EventRecord[] {
		return this.history.filter((record) => record.event.type === eventName);
	}

	public getRecent(count: number): EventRecord[] {
		return this.history.slice(-count);
	}

	public getSlowEvents(threshold: number): EventRecord[] {
		return this.history.filter((record) => record.processingTime > threshold);
	}

	public getStoppedEvents(): EventRecord[] {
		return this.history.filter((record) => record.wasStopped);
	}

	public getHistory(): EventRecord[] {
		return [...this.history];
	}

	public enable() {
		this.enabled = true;
	}

	public disable() {
		this.enabled = false;
	}

	public isEnabled() {
		return this.enabled;
	}

	public size() {
		return this.history.length;
	}

	public clear() {
		return (this.history.length = 0);
	}
}
