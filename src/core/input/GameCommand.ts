import { InputBinding } from "./InputBinding";


export abstract class GameCommand
{
    protected abstract name: string;
    protected abstract inputBinding: InputBinding;


    public execute(elapsed: number)
    {
        if(this.inputBinding.condition()) {
            this.action(elapsed);
        }
    }

    protected abstract action(elapsed: number): void;


    public bindInput(inputBinding: InputBinding)
    {
        this.inputBinding = inputBinding;
    }

    public getName(): string
    {
        return this.name;
    }
}