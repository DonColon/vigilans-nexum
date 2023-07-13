import { AssetLoadedEvent } from "./AssetLoadedEvent";


export interface ModuleLoadedEvent extends AssetLoadedEvent
{
    module: any
}