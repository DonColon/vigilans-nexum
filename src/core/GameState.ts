export type GameStateConstructor = new () => GameState;

export abstract class GameState {
	public abstract onEnter(): void;
	public abstract onExit(): void;
	public abstract onPause(): void;
	public abstract onResume(): void;
}
