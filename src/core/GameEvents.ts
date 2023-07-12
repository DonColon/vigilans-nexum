import { WorldEvent } from "./ecs/WorldEvent";
import { AudioLoadedEvent } from "./assets/AudioLoadedEvent";


export interface GameEvents
{
    "entityChanged": WorldEvent,
    "audioLoaded": AudioLoadedEvent
}