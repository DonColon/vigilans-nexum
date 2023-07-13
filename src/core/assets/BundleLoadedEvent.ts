import { GameEvent } from "core/GameEvent";


export interface BundleLoadedEvent extends GameEvent
{
    bundle: string
}