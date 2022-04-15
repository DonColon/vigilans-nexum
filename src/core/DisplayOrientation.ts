import { stringEnumExists } from "utils/Enums";


export enum DisplayOrientation
{
    ANY = "any",
    NATURAL = "natural",

    LANDSCAPE = "landscape",
    LANDSCAPE_PRIMARY = "landscape-primary",
    LANDSCAPE_SECONDARY = "landscape-secondary",

    PORTRAIT = "portrait",
    PORTRAIT_PRIMARY = "portrait-primary",
    PORTRAIT_SECONDARY = "portrait-secondary",
}

export namespace DisplayOrientation
{
    export function keys(): string[] 
    {
        return Object.keys(DisplayOrientation as object);
    }

    export function values(): DisplayOrientation[]
    {
        return Object.values(DisplayOrientation as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(DisplayOrientation, value);
    }
}