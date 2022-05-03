import { Entity } from "./Entity"


export interface GameEvent
{
    type?: string,
    timestamp?: number
}

export interface WorldEvent extends GameEvent
{
    entity: Entity
}

export interface GameEventMap
{
    "componentsChanged": WorldEvent
}


export type GameEventListener = <K extends keyof GameEventMap>(event: GameEventMap[K]) => any;