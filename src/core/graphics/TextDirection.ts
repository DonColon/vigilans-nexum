import { stringEnumExists } from "core/utils/Enums";


export enum TextDirection
{
    LTR = "ltr",
    RTL = "rtl",
    INHERIT = "inherit"
}

export namespace TextDirection
{
    export function keys(): string[] 
    {
        return Object.keys(TextDirection as object);
    }

    export function values(): TextDirection[]
    {
        return Object.values(TextDirection as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(TextDirection, value);
    }
}