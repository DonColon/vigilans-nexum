import { EventNames, GameEvents } from "@/core/events/GameEvents";
import { GameEvent } from "@/core/events/GameEvent";

export class EventQueue {
	private readonly queue: GameEvent[] = [];

	public enqueue<Name extends EventNames>(event: GameEvents[Name]) {
		this.queue.push(event);
	}

	public dequeueAll(): GameEvent[] {
		const events = [...this.queue];
		this.queue.length = 0;
		return events;
	}

	public get size(): number {
		return this.queue.length;
	}

	public get isEmpty(): boolean {
		return this.queue.length === 0;
	}

	public peek(): GameEvent | undefined {
		return this.queue[0];
	}
}
