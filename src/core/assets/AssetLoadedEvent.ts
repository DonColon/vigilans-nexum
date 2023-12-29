import { GameEvent } from "core/events/GameEvent";

export interface AssetLoadedEvent extends GameEvent {
	assetID: string;
}
