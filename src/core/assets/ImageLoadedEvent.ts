import { AssetLoadedEvent } from "./AssetLoadedEvent";


export interface ImageLoadedEvent extends AssetLoadedEvent
{
    image: HTMLImageElement
}