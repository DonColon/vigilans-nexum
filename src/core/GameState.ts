import { GameCommand } from "./input/GameCommand";


export abstract class GameState
{
    private commands: Map<string, GameCommand>;


    constructor()
    {
        this.commands = new Map<string, GameCommand>();
    }


    public abstract onEnter(): void;
    public abstract onExit(): void;


    public getCommand(name: string): GameCommand
    {
        return this.commands.get(name) as GameCommand;
    }

    public addCommand(command: GameCommand): GameState
    {
        this.commands.set(command.getName(), command);
        return this;
    }

    public removeCommand(name: string): GameState
    {
        this.commands.delete(name);
        return this;
    }
}