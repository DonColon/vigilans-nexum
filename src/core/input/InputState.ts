import { stringEnumExists } from "core/utils/Enums";


export enum InputState
{
    STILL_RELEASED = "StillReleased",
    JUST_PRESSED = "JustPressed",
    STILL_PRESSED = "StillPressed",
    JUST_RELEASED = "JustReleased",
}

export namespace InputState
{
    export function keys(): string[] 
    {
        return Object.keys(InputState as object);
    }

    export function values(): InputState[]
    {
        return Object.values(InputState as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(InputState, value);
    }
}