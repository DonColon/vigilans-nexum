import { GameCoreService } from "@/core/service/GameCoreService";
import { EventHistory, EventHistoryConfig } from "@/core/events/EventHistory";
import { EventQueue } from "@/core/events/EventQueue";
import { GameEvent } from "@/core/events/GameEvent";
import { EventHandler, EventNames, EventSubscriber, GameEvents, UnsubscribeFunction } from "@/core/events/GameEvents";

export interface EventSystemConfig {
	history: EventHistoryConfig;
}

@GameCoreService()
export class EventSystem {
	private readonly subscribers: Map<EventNames, EventSubscriber<any>[]>;
	private readonly queue: EventQueue;
	private readonly history: EventHistory;

	constructor(config: EventSystemConfig) {
		this.subscribers = new Map<EventNames, EventSubscriber<any>[]>();
		this.queue = new EventQueue();
		this.history = new EventHistory(config.history);
	}

	public subscribe<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>, priority: number = 0): UnsubscribeFunction {
		const subscribers = this.subscribers.get(eventName) || [];
		subscribers.push({ priority, handler });
		subscribers.sort((value, other) => other.priority - value.priority);

		this.subscribers.set(eventName, subscribers);

		return () => this.unsubscribe(eventName, handler);
	}

	public subscribeOnce<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>, priority: number = 0) {
		const wrapper: EventHandler<Name> = (event) => {
			handler(event);
			this.unsubscribe(eventName, wrapper);
		};

		this.subscribe(eventName, wrapper, priority);
	}

	public unsubscribe<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>) {
		let handlers = this.subscribers.get(eventName) || [];
		handlers = handlers.filter((subscriber) => subscriber.handler !== handler);

		this.subscribers.set(eventName, handlers);
	}

	public dispatch<Name extends EventNames>(eventName: Name, data: Omit<GameEvents[Name], keyof GameEvent>) {
		let stopped = false;

		const event = {
			type: eventName,
			timestamp: Date.now(),
			stopPropagation: () => {
				stopped = true;
			},
			isPropagationStopped: () => stopped,
			...data
		} as GameEvents[Name];

		this.queue.enqueue(event);
	}

	public processQueue() {
		const events = this.queue.dequeueAll();

		for (const event of events) {
			this.processEvent(event);
		}
	}

	private processEvent(event: GameEvent) {
		const subscribers = this.subscribers.get(event.type) || [];
		const startTime = performance.now();

		for (const subscriber of subscribers) {
			if (event.isPropagationStopped()) break;

			try {
				subscriber.handler(event);
			} catch (error) {
				console.error(`Error in event handler for event "${event.type}":`, error);
			}
		}

		const processingTime = performance.now() - startTime;
		this.history.record(event, subscribers.length, processingTime);
	}

	public enableHistory() {
		this.history.enable();
	}

	public disableHistory() {
		this.history.disable();
	}

	public printEventStatistics() {
		this.history.printStatistics();
	}

	public getSubscribers(name: EventNames): EventSubscriber<any>[] {
		return this.subscribers.get(name) || [];
	}
}
