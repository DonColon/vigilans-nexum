import { GameEvent } from "core/GameEvent";


export interface AssetLoadedEvent extends GameEvent
{
    assetID: string
}