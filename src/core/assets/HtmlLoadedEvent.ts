import { AssetLoadedEvent } from "./AssetLoadedEvent";


export interface HtmlLoadedEvent extends AssetLoadedEvent
{
    html: Document
}