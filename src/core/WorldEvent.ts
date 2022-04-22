import { stringEnumExists } from "core/utils/Enums";
import { Entity } from "./Entity";


export interface WorldEvent
{
    entity: Entity
}


export enum EventType
{
    COMPONENT_CHANGED = "componentsChanged",
}

export namespace EventType
{
    export function keys(): string[] 
    {
        return Object.keys(EventType as object);
    }

    export function values(): EventType[]
    {
        return Object.values(EventType as object);
    }

    export function exists(value: string): boolean
    {
        return stringEnumExists(EventType, value);
    }
}