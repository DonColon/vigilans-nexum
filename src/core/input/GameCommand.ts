import { InputBinding } from "./InputBinding";


export interface GameCommandConstructor
{
    new(): GameCommand,
}


export abstract class GameCommand
{
    protected abstract binding: InputBinding;


    public execute(elapsed: number, frame: number)
    {
        if(this.binding.condition()) {
            this.action(elapsed, frame);
        }
    }

    protected abstract action(elapsed: number, frame: number): void;


    public bindInput(binding: InputBinding)
    {
        this.binding = binding;
    }
}