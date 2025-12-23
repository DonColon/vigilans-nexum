import { GameEvent } from "core/events/GameEvent";

interface BundleEvent extends GameEvent {
	bundle: string;
}

export interface BundleLoadedEvent extends BundleEvent {
	loaded: number;
	failed: number;
}

export interface BundleUnloadedEvent extends BundleEvent {
	removed: number;
}

export interface BundleProgressEvent extends BundleEvent {
    current: number;
    total: number;
    progress: number;
}