import { GameCoreService } from "../service/GameCoreService";
import { GameEvent } from "./GameEvent";
import { EventHandler, EventNames, EventSubscriber, GameEvents, UnsubscribeFunction } from "./GameEvents";

@GameCoreService()
export class EventSystem {
	private readonly subscribers: Map<EventNames, EventSubscriber<any>[]> = new Map<EventNames, EventSubscriber<any>[]>();

	public subscribe<Name extends EventNames>(
		eventName: Name, 
		handler: EventHandler<Name>, 
		priority: number = 0
	): UnsubscribeFunction {
		const subscribers = this.subscribers.get(eventName) || [];
		subscribers.push({ priority, handler });
		subscribers.sort((a, b) => (a.priority || 0) - (b.priority || 0));

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
		const subscribers = this.subscribers.get(eventName) || [];
		let stopped = false;

		const event = {
			type: eventName,
			timestamp: Date.now(),
			stopPropagation: () => { stopped = true; },
			...data
		} as GameEvents[Name];

		for (const subscriber of subscribers) {
			if (stopped) break;
			
			try {
				subscriber.handler(event);
			} catch (error) {
				console.error(`Error in event handler for event "${eventName}":`, error);
			}
		}
	}

	public getSubscribers(name: EventNames): EventSubscriber<any>[] {
		return this.subscribers.get(name) || [];
	}
}
