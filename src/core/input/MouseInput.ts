import { numberEnumKeys, numberEnumValues } from "core/utils/Enums";


export enum MouseInput
{
    LEFT = 0,
    RIGHT = 2,
    WHEEL = 1,
    WHEEL_UP = 5,
    WHEEL_DOWN = 6,
    
    FORWARD = 4,
    BACKWARD = 3,
}

export namespace MouseInput
{
    export function keys(): string[] 
    {
        return numberEnumKeys(MouseInput);
    }

    export function values(): MouseInput[]
    {
        return numberEnumValues(MouseInput);
    }

    export function exists(value: number): boolean
    {
        return value in MouseInput;
    }
}