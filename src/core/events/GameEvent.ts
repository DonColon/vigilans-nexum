export interface GameEvent {
	type: string;
	timestamp: number;
	stopPropagation(): void;
}
