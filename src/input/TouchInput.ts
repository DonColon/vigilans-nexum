import { numberEnumKeys, numberEnumValues } from "utils/Enums";


export enum TouchInput
{
    TOUCH,
    SWIPE_LEFT,
    SWIPE_RIGHT,
    SWIPE_UP,
    SWIPE_DOWN,
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