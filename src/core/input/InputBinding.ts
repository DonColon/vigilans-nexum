import { DeviceInputType } from "./InputDevice";
import { InputChannelType } from "./InputChannel";
import { InputStateType } from "./InputState";


export interface InputBindingSettings
{
    channel: InputChannelType;
    input: DeviceInputType;
    state: InputStateType;
}

export interface InputBindingsSettings
{
    bindings: InputBinding[];
    and: boolean; 
}


export class InputBinding
{
    private channel?: InputChannelType;
    private input?: DeviceInputType;
    private state?: InputStateType;

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