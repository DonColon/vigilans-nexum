import { GameEvent } from "core/events/GameEvent";


export interface BundleLoadedEvent extends GameEvent
{
    bundle: string
}