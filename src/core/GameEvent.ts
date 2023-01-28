import { WorldEvent } from "./ecs/WorldEvent";


export type GameEventListener = <K extends keyof GameEventMap>(event: GameEventMap[K]) => void;


export interface GameEvent
{
    type: string,
    timestamp: number
}

export interface GameEventMap
{
    "entityChanged": WorldEvent
}