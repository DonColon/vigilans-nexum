import { AssetLoadedEvent } from "./AssetLoadedEvent";


export interface CssLoadedEvent extends AssetLoadedEvent
{
    css: HTMLLinkElement
}