import { AudioTrack } from "./AudioTrack";


interface AudioResource
{
    [id: string]: string
}

interface AudioResourceMap
{
    [channel: string]: AudioResource
}


export class AudioLoader
{
    private context: AudioContext;


    constructor(private resourceMap: AudioResourceMap)
    {
        this.context = new AudioContext();
    }


    public async load()
    {
        const tracks = new Map<string, AudioTrack>();

        for(const [channel, resources] of Object.entries(this.resourceMap)) {
            eventSystem.dispatch("channelAdded", { channel });

            for(const [id, resource] of Object.entries(resources)) {
                const buffer = await this.loadAudio(resource);
                tracks.set(id, { channel, buffer });
            }
        }

        eventSystem.dispatch("audioLoaded", { tracks });
    }

    private async loadAudio(resource: string): Promise<AudioBuffer>
    {
        const response = await fetch(resource);
        const buffer = await response.arrayBuffer();
        return this.context.decodeAudioData(buffer);
    }
}