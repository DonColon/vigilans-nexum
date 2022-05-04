import { GameCommand } from "./GameCommand";


export class InputContext
{
    readonly name: string;
    private commands: Map<string, GameCommand>;


    constructor(name: string)
    {
        this.name = name;
        this.commands = new Map<string, GameCommand>();
    }


    public addCommand(command: GameCommand): InputContext
    {
        this.commands.set(command.name, command);
        return this;
    }

    public getCommand(name: string): GameCommand
    {
        return this.commands.get(name) as GameCommand;
    }

    public removeCommand(name: string): InputContext
    {
        this.commands.delete(name);
        return this;
    }
}