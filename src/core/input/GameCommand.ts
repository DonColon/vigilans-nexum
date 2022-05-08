import { InputBinding } from "./InputBinding";


export abstract class GameCommand
{
    protected abstract name: string;
    protected abstract inputBinding: InputBinding;


    public execute(elapsed: number, frame: number)
    {
        if(this.inputBinding.condition()) {
            this.action(elapsed, frame);
        }
    }

    protected abstract action(elapsed: number, frame: number): void;


    public bindInput(inputBinding: InputBinding)
    {
        this.inputBinding = inputBinding;
    }

    public getName(): string
    {
        return this.name;
    }
}