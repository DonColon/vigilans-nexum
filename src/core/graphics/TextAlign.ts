import { stringEnumExists } from "core/utils/Enums";


export enum TextAlign
{
    START = "start",
    LEFT = "left",
    CENTER = "center",
    RIGHT = "right",
    END = "end"
}

export namespace TextAlign
{
    export function keys(): string[] 
    {
        return Object.keys(TextAlign as object);
    }

    export function values(): TextAlign[]
    {
        return Object.values(TextAlign as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(TextAlign, value);
    }
}