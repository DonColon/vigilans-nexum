import { GameEvent } from "core/GameEvent";
import { Entity } from "./Entity";


export interface WorldEvent extends GameEvent
{
    entity: Entity
}