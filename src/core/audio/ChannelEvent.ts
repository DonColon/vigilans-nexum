import { GameEvent } from "core/GameEvent";


export interface ChannelEvent extends GameEvent
{
    channel: string
}