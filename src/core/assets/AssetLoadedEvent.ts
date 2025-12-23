import { GameEvent } from "core/events/GameEvent";
import { LoadableAssets } from "./LoadableAssets";

export type AssetLoadedEvent = {
    [K in keyof LoadableAssets]: GameEvent & {
        assetID: string;
        assetType: K;
        payload: LoadableAssets[K];
    }
}[keyof LoadableAssets];