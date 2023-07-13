import { AssetLoadedEvent } from "./AssetLoadedEvent";


export interface XmlLoadedEvent extends AssetLoadedEvent
{
    xml: XMLDocument
}