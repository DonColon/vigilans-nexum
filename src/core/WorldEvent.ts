import { stringEnumExists } from "core/utils/Enums";
import { Entity } from "./Entity";


export interface WorldEvent
{
    entity: Entity
}


export enum WorldEventType
{
    COMPONENT_CHANGED = "componentsChanged",
}

export namespace WorldEventType
{
    export function keys(): string[] 
    {
        return Object.keys(WorldEventType as object);
    }

    export function values(): WorldEventType[]
    {
        return Object.values(WorldEventType as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(WorldEventType, value);
    }
}