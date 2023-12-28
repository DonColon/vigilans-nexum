export interface GameStateConstructor
{
    new(): GameState,
}


export abstract class GameState
{
    public abstract onEnter(): void;
    public abstract onExit(): void;
}
