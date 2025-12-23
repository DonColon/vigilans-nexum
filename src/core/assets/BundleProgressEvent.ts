import { GameEvent } from "../events/GameEvent";

export interface BundleProgressEvent extends GameEvent{
    bundleName: string;
    current: number;
    total: number;
    progress: number;
}