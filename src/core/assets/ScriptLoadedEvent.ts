import { AssetLoadedEvent } from "./AssetLoadedEvent";


export interface ScriptLoadedEvent extends AssetLoadedEvent
{
    script: HTMLScriptElement
}