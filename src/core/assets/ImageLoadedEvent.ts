import { Sprite } from "core/graphics/Sprite";
import { AssetLoadedEvent } from "./AssetLoadedEvent";


export interface ImageLoadedEvent extends AssetLoadedEvent
{
    image: Sprite
}