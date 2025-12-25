import { GameCoreService } from "../service/GameCoreService";
import { EventQueue } from "./EventQueue";
import { GameEvent } from "./GameEvent";
import { EventHandler, EventNames, EventSubscriber, GameEvents, UnsubscribeFunction } from "./GameEvents";

@GameCoreService()
export class EventSystem {
	private readonly subscribers: Map<EventNames, EventSubscriber<any>[]> = new Map<EventNames, EventSubscriber<any>[]>();
	private readonly queue: EventQueue = new EventQueue();

	public subscribe<Name extends EventNames>(
		eventName: Name, 
		handler: EventHandler<Name>, 
		priority: number = 0
	): UnsubscribeFunction {
		const subscribers = this.subscribers.get(eventName) || [];
		subscribers.push({ priority, handler });
		subscribers.sort((value, other) => other.priority - value.priority);

		this.subscribers.set(eventName, subscribers);

		return () => this.unsubscribe(eventName, handler);
	}

	public subscribeOnce<Name extends EventNames>(
		eventName: Name, 
		handler: EventHandler<Name>, 
		priority: number = 0
	) {
		const wrapper: EventHandler<Name> = (event) => {
			handler(event);
			this.unsubscribe(eventName, wrapper);
		};

+		this.subscribe(eventName, wrapper, priority);
	}

	public unsubscribe<Name extends EventNames>(
		eventName: Name, 
		handler: EventHandler<Name>
	) {
		let handlers = this.subscribers.get(eventName) || [];
		handlers = handlers.filter((subscriber) => subscriber.handler !== handler);

		this.subscribers.set(eventName, handlers);
	}

	public dispatch<Name extends EventNames>(
		eventName: Name, 
		data: Omit<GameEvents[Name], keyof GameEvent>
	) {
		let stopped = false;

		const event = {
			type: eventName,
			timestamp: Date.now(),
			stopPropagation: () => { stopped = true; },
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

		for (const subscriber of subscribers) {
			if (event.isPropagationStopped()) break;

			try {
				subscriber.handler(event);
			} catch (error) {
				console.error(`Error in event handler for event "${event.type}":`, error);
			}
		}
	}

	public getSubscribers(name: EventNames): EventSubscriber<any>[] {
		return this.subscribers.get(name) || [];
	}
}
