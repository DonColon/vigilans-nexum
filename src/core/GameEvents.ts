import { WorldEvent } from "./ecs/WorldEvent";
import { ChannelEvent } from "./audio/ChannelEvent";
import { AudioLoadedEvent } from "./audio/AudioLoadedEvent";


export interface GameEvents
{
    "entityChanged": WorldEvent,
    "channelAdded": ChannelEvent,
    "audioLoaded": AudioLoadedEvent
}