import { WorldEvent } from "../ecs/WorldEvent";
import { BundleLoadedEvent } from "../assets/BundleLoadedEvent";
import { AssetLoadedEvent } from "../assets/AssetLoadedEvent";
import { AssetFailedEvent } from "../assets/AssetFailedEvent";
import { BundleProgressEvent } from "../assets/BundleProgressEvent";

export type EventNames = keyof GameEvents;
export type EventHandler<Name extends EventNames> = (event: GameEvents[Name]) => void;

export interface GameEvents {
	entityChanged: WorldEvent;
	entityRemoved: WorldEvent;
	bundleLoaded: BundleLoadedEvent;
	bundleProgress: BundleProgressEvent;
	assetLoaded: AssetLoadedEvent;
	assetFailed: AssetFailedEvent;
}
