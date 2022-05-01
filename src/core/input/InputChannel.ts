import { stringEnumExists } from "core/utils/Enums";


export enum InputChannel
{
    GAMEPAD = "Gamepad",
    KEYBOARD = "Keyboard",
    MOUSE = "Mouse",
    TOUCHPAD = "Touchpad",
}

export namespace InputChannel
{
    export function keys(): string[] 
    {
        return Object.keys(InputChannel as object);
    }

    export function values(): InputChannel[]
    {
        return Object.values(InputChannel as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(InputChannel, value);
    }
}