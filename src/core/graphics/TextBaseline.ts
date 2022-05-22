import { stringEnumExists } from "core/utils/Enums";


export enum TextBaseline
{
    TOP = "top",
    HANGING = "hanging",
    MIDDLE = "middle",
    ALPHABETIC = "alphabetic",
    IDEOGRAPHIC = "ideographic",
    BOTTOM = "bottom"
}

export namespace TextBaseline
{
    export function keys(): string[] 
    {
        return Object.keys(TextBaseline as object);
    }

    export function values(): TextBaseline[]
    {
        return Object.values(TextBaseline as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(TextBaseline, value);
    }
}