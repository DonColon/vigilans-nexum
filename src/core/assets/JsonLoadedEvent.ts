import { AssetLoadedEvent } from "./AssetLoadedEvent";

export interface JsonLoadedEvent extends AssetLoadedEvent {
	json: object;
}
