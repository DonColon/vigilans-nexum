import { WorldEvent } from "./ecs/WorldEvent";


export interface GameEvent
{
    type?: string,
    timestamp?: number
}

export interface GameEventMap
{
    "componentsChanged": WorldEvent
}


export type GameEventListener = <K extends keyof GameEventMap>(event: GameEventMap[K]) => any;