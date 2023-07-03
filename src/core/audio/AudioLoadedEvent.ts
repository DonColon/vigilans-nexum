import { GameEvent } from "core/GameEvent";
import { AudioTrack } from "./AudioTrack";


export interface AudioLoadedEvent extends GameEvent
{
    tracks: Map<string, AudioTrack>
}