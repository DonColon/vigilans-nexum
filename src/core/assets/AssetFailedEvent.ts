import { GameEvent } from "../events/GameEvent";

export interface AssetFailedEvent extends GameEvent {
    code: number;
    message: string;
    error: unknown;
}