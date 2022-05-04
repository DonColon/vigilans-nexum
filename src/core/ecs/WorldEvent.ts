import { Entity } from "./Entity";
import { GameEvent } from "../GameEvent";


export interface WorldEvent extends GameEvent
{
    entity: Entity
}