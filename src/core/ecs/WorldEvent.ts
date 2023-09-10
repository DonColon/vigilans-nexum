import { GameEvent } from "core/events/GameEvent";
import { Entity } from "./Entity";


export interface WorldEvent extends GameEvent
{
    entity: Entity
}