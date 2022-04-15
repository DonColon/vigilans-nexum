import { numberEnumKeys, numberEnumValues } from "utils/Enums";


export enum TouchInput
{
    TOUCH = 7,
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