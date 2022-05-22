import { stringEnumExists } from "core/utils/Enums";


export enum LineCap
{
    BUTT = "butt",
    ROUND = "round",
    SQUARE = "square"
}

export namespace LineCap
{
    export function keys(): string[] 
    {
        return Object.keys(LineCap as object);
    }

    export function values(): LineCap[]
    {
        return Object.values(LineCap as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(LineCap, value);
    }
}