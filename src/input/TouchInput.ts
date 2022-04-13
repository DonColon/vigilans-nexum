import { numberEnumKeys, numberEnumValues } from "utils/Enums";


export enum TouchInput
{
    TOUCH = 7,
    SWIPE_LEFT = 8,
    SWIPE_RIGHT = 9,
    SWIPE_UP = 10,
    SWIPE_DOWN = 11,
}

export namespace TouchInput
{
    export function keys(): string[] 
    {
        return numberEnumKeys(TouchInput);
    }

    export function values(): TouchInput[]
    {
        return numberEnumValues(TouchInput);
    }

    export function exists(value: number): boolean
    {
        return value in TouchInput;
    }
}