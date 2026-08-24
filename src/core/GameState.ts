export type GameStateConstructor = (new () => GameState) & { readonly type: string };

export abstract class GameState {
	/**
	 * Stable identifier of this state. Savegames store the active states by
	 * this id, so it must not be derived from the class name - see the note on
	 * Component.type. Every concrete state has to declare its own.
	 */
	public static readonly type: string = "state";

	public abstract onEnter(): void;
	public abstract onExit(): void;
	public abstract onPause(): void;
	public abstract onResume(): void;
}
