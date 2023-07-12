import { AssetLoadedEvent } from "./AssetLoadedEvent";
import { AudioTrack } from "../audio/AudioTrack";


export interface AudioLoadedEvent extends AssetLoadedEvent
{
    track: AudioTrack
}