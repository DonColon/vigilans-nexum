import { WorldEvent } from "../ecs/WorldEvent";
import { BundleLoadedEvent, BundleProgressEvent, BundleUnloadedEvent } from "../assets/BundleEvents";

export type EventNames = keyof GameEvents;
export type EventHandler<Name extends EventNames> = (event: GameEvents[Name]) => void;

export interface EventSubscriber<Name extends EventNames> {
	priority: number;
	handler: EventHandler<Name>;
}

export type UnsubscribeFunction = () => void;

export interface GameEvents {
	entityChanged: WorldEvent;
	entityRemoved: WorldEvent;
	bundleLoaded: BundleLoadedEvent;
	bundleUnloaded: BundleUnloadedEvent;
	bundleProgress: BundleProgressEvent;
}
