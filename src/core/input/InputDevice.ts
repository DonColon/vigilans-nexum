import { Display } from "core/Display";
import { GameError } from "core/GameError";
import { Input, InputTypeMap } from "./Input";
import { InputState, InputStateType } from "./InputState";
import { InputChannel, InputChannelType } from "./InputChannel";
import { GamepadDevice } from "./GamepadDevice";
import { GamepadInputType } from "./GamepadInput";
import { KeyboardDevice } from "./KeyboardDevice";
import { KeyboardInputType } from "./KeyboardInput";
import { MouseDevice } from "./MouseDevice";
import { MouseInputType } from "./MouseInput";
import { TouchpadDevice } from "./TouchpadDevice";
import { SwipeInputType } from "./SwipeInput";
import { TouchInputType } from "./TouchInput";


export class InputDevice
{
    private channels: Map<InputChannelType, number>;
    private display: Display;

    private gamepad: GamepadDevice;
    private keyboard: KeyboardDevice;
    private mouse: MouseDevice;
    private touchpad: TouchpadDevice;


    constructor(display: Display)
    {
        this.channels = new Map<InputChannelType, number>();
        this.display = display;

        if(!this.isGamepadSupported()) {
            throw new GameError("Gamepad not supported by browser");
        }

        this.gamepad = new GamepadDevice();
        this.keyboard = new KeyboardDevice();
        this.mouse = new MouseDevice(this.display);
        this.touchpad = new TouchpadDevice(this.display);

        window.addEventListener( "contextmenu", event => this.cancelEvent(event));
        window.addEventListener( "selectstart", event => this.cancelEvent(event));
    }


    public update()
    {
        this.channels.set(InputChannel.GAMEPAD, this.gamepad.update());
        this.channels.set(InputChannel.KEYBOARD, this.keyboard.update());
        this.channels.set(InputChannel.MOUSE, this.mouse.update());
        this.channels.set(InputChannel.TOUCHPAD, this.touchpad.update());
    }

    public uses(channel: InputChannelType): boolean
    {
        const max = Math.max(...this.channels.values());
        const inputChannel = [...this.channels].find(([key, value]) => value === max);
        
        if(!inputChannel) return false;

        return inputChannel.at(0) === channel;
    }

    public isState<K extends keyof InputTypeMap>(channel: K, inputType: InputTypeMap[K], state: InputStateType): boolean
    {
        return this.getState(channel, inputType) === state;
    }


    private getState<K extends keyof InputTypeMap>(channel: K, inputType: InputTypeMap[K]): InputStateType
    {
        const input = this.getInput(channel, inputType);

        if(input.previous === false && input.current === false) {
            return InputState.STILL_RELEASED;
        }
        else if(input.previous === false && input.current === true) {
            return InputState.JUST_PRESSED;
        }
        else if(input.previous === true && input.current === true) {
            return InputState.STILL_PRESSED;
        }
        else if(input.previous === true && input.current === false) {
            return InputState.JUST_RELEASED;
        }

        return InputState.STILL_RELEASED;
    }

    private getInput<K extends keyof InputTypeMap>(channel: K, inputType: InputTypeMap[K]): Input
    {
        if(channel === InputChannel.GAMEPAD) {
            return this.gamepad.getInput(inputType as GamepadInputType);
        }
        else if(channel === InputChannel.KEYBOARD) {
            return this.keyboard.getInput(inputType as KeyboardInputType);
        }
        else if(channel === InputChannel.MOUSE) {
            return this.mouse.getInput(inputType as MouseInputType);
        }
        else if(channel === InputChannel.TOUCHPAD) {
            return this.touchpad.getInput(inputType as TouchInputType | SwipeInputType);
        }

        return { current: false, previous: false };
    }
    
    private isGamepadSupported()
    {
        return "getGamepads" in navigator;
    }

    private cancelEvent(event: Event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}