import { GameCoreService } from "../service/GameCoreService";
import { GameEvent } from "./GameEvent";
import { EventHandler, EventNames, GameEvents, UnsubscribeFunction } from "./GameEvents";

@GameCoreService()
export class EventSystem {
	private readonly subscribers: Map<EventNames, EventHandler<any>[]> = new Map<EventNames, EventHandler<any>[]>();

	public subscribe<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>): UnsubscribeFunction {
		const handlers = this.subscribers.get(eventName) || [];
		handlers.push(handler);

		this.subscribers.set(eventName, handlers);

		return () => this.unsubscribe(eventName, handler);
	}

	public subscribeOnce<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>) {
		const wrapper: EventHandler<Name> = (event) => {
			handler(event);
			this.unsubscribe(eventName, wrapper);
		};

+		this.subscribe(eventName, wrapper);
	}

	public unsubscribe<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>) {
		let handlers = this.subscribers.get(eventName) || [];
		handlers = handlers.filter((subscriber) => subscriber !== handler);

		this.subscribers.set(eventName, handlers);
	}

	public dispatch<Name extends EventNames>(eventName: Name, data: Omit<GameEvents[Name], keyof GameEvent>) {
		const handlers = this.subscribers.get(eventName) || [];

		const event = {
			type: eventName,
			timestamp: Date.now(),
			...data
		} as GameEvents[Name];

		for (const handler of handlers) {
			try {
				handler(event);
			} catch (error) {
				console.error(`Error in event handler for event "${eventName}":`, error);
			}
		}
	}

	public getSubscribers(name: EventNames): EventHandler<any>[] {
		return this.subscribers.get(name) || [];
	}
}
