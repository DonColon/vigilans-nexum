import { InputType } from "./Input";
import { InputChannelType } from "./InputChannel";
import { InputStateType } from "./InputState";


interface SimpleInputBinding
{
    channel: InputChannelType;
    input: InputType;
    state: InputStateType;
}

interface ComplexInputBinding
{
    bindings: InputBinding[];
    and: boolean; 
}


export class InputBinding
{
    private simple?: SimpleInputBinding;
    private complex?: ComplexInputBinding;


    constructor(binding: SimpleInputBinding | ComplexInputBinding)
    {
        if(InputBinding.isSimple(binding)) {
            this.simple = binding;
        }
        else if(InputBinding.isComplex(binding)) {
            this.complex = binding;
        }
    }


    private static isSimple(binding: object): binding is SimpleInputBinding
    {
        return "channel" in binding && "input" in binding && "state" in binding;
    }

    private static isComplex(binding: object): binding is ComplexInputBinding
    {
        return "bindings" in binding && "and" in binding;
    }

    
    public condition(): boolean
    {
        if(this.simple) {
            const { channel, input, state } = this.simple;
            return inputDevice.isState(channel, input, state);
        }

        if(this.complex) {
            const { bindings, and } = this.complex;

            if(and) {
                return bindings.every(binding => binding.condition());
            } else {
                return bindings.some(binding => binding.condition());
            }
        }

        return false;
    }
}