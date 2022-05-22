import { stringEnumExists } from "core/utils/Enums";


export enum LineJoin
{
    ROUND = "round",
    BEVEL = "bevel",
    MITER = "miter"
}

export namespace LineJoin
{
    export function keys(): string[] 
    {
        return Object.keys(LineJoin as object);
    }

    export function values(): LineJoin[]
    {
        return Object.values(LineJoin as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(LineJoin, value);
    }
}