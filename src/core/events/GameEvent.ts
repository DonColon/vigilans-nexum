import { EventNames } from "@/core/events/GameEvents";

export interface GameEvent {
	type: EventNames;
	timestamp: number;
	stopPropagation(): void;
	isPropagationStopped: () => boolean;
}
