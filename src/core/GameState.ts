import { GameError } from "./GameError";
import { GameCommand } from "./input/GameCommand";


export interface GameStateConstructor
{
    new(): GameState,
}


export abstract class GameState
{
    private commands: Map<string, GameCommand> = new Map<string, GameCommand>();


    public abstract onEnter(): void;
    public abstract onExit(): void;


    public addCommand(command: GameCommand): this
    {
        this.commands.set(command.getName(), command);
        return this;
    }

    public removeCommand(name: string): this
    {
        this.commands.delete(name);
        return this;
    }

    public getCommand(name: string): GameCommand
    {
        const command = this.commands.get(name);

        if(command === undefined) {
            throw new GameError(`Command ${name} does not exist`);
        }

        return command;
    }
}