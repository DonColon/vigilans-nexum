import { InputChannel } from "./InputChannel";
import { DeviceInput } from "./InputDevice";
import { InputState } from "./InputState";


export interface InputBindingSettings
{
    channel: InputChannel;
    input: DeviceInput;
    state: InputState;
}

export interface InputBindingsSettings
{
    bindings: InputBinding[];
    and: boolean; 
}


export class InputBinding
{
    private channel?: InputChannel;
    private input?: DeviceInput;
    private state?: InputState;

    private bindings?: InputBinding[];
    private and?: boolean; 


    constructor(settings: InputBindingSettings | InputBindingsSettings)
    {
        if("channel" in settings && "input" in settings && "state" in settings) {
            this.channel = settings.channel;
            this.input = settings.input;
            this.state = settings.state;
        }
        else if("bindings" in settings && "and" in settings) {
            this.bindings = settings.bindings;
            this.and = settings.and;
        }
    }

    
    public condition(): boolean
    {
        if(this.channel !== undefined && this.input !== undefined && this.state !== undefined) {
            return inputDevice.isStateOf(this.channel, this.input, this.state);
        }

        if(this.bindings !== undefined && this.and !== undefined) {
            if(this.and) {
                return this.bindings.every((binding: InputBinding) => binding.condition());
            } else {
                return this.bindings.some((binding: InputBinding) => binding.condition());
            }
        }

        return false;
    }
}