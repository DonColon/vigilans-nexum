import { AudioTrack } from "core/audio/AudioTrack";
import { AudioLoadedEvent } from "./AudioLoadedEvent";
import { GameError } from "core/GameError";


export class AssetStorage
{
    private audio: Map<string, AudioTrack>;


    constructor()
    {
        this.audio = new Map<string, AudioTrack>();

        eventSystem.subscribe("audioLoaded", event => this.onAudioLoaded(event));
    }


    private onAudioLoaded(event: AudioLoadedEvent)
    {
        this.audio.set(event.assetID, event.track);
    }


    public getAudio(id: string): AudioTrack
    {
        const track = this.audio.get(id);

        if(track === undefined) {
            throw new GameError(`Track ${id} does not exist`);
        }

        return track;
    }

    public setAudio(id: string, track: AudioTrack)
    {
        this.audio.set(id, track);
    }
}