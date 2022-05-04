import { InputBinding } from "./InputBinding";


export abstract class GameCommand
{
    readonly name!: string;
    protected inputBinding: InputBinding;


    constructor(inputBinding: InputBinding)
    {
        this.inputBinding = inputBinding
    }


    public bindInput(inputBinding: InputBinding)
    {
        this.inputBinding = inputBinding;
    }

    public execute(elapsed: number)
    {
        if(this.inputBinding.condition()) {
            this.action(elapsed);
        }
    }


    protected abstract action(elapsed: number): void;
}