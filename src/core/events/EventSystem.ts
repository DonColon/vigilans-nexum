import { GameEvent } from "./GameEvent";
import { EventHandler, EventNames, GameEvents } from "./GameEvents";

export class EventSystem {
	private subscribers: Map<EventNames, EventHandler[]> = new Map<EventNames, EventHandler[]>();

	public subscribe<Name extends EventNames>(eventName: Name, handler: EventHandler<Name>) {
		const handlers = this.subscribers.get(eventName) || [];
		handlers.push(handler);

		this.subscribers.set(eventName, handlers);
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
			handler(event);
		}
	}
}
