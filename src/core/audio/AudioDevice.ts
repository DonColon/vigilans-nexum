import { GameError } from "core/GameError";
import { UserGestures } from "core/UserGestures";
import { AudioChannel } from "./AudioChannel";


export interface AudioConfiguration
{
    channels: string[]
}


export class AudioDevice
{
    private context: AudioContext;
    private channels: Map<string, AudioChannel>;
    private masterVolume: GainNode;


    constructor(config?: AudioConfiguration)
    {
        this.context = new AudioContext();
        this.channels = new Map<string, AudioChannel>();

        this.masterVolume = this.context.createGain();
        this.masterVolume.connect(this.context.destination);

        if(config) {
            for(const channel of config.channels) {
                this.addChannel(channel);
            }
        }

        this.start();
    }

    private start()
    {
        for(const userGesture of UserGestures) {
            document.addEventListener(userGesture, event => this.unlock());
        }
    }

    private unlock()
    {
        if(this.context.state === "suspended") {
            this.context.resume();
        }

        if(this.context.state === "running") {
            for(const userGesture of UserGestures) {
                document.removeEventListener(userGesture, event => this.unlock());
            }
        }
    }


    public play(id: string, loop: boolean = false)
    {
        const track = assetStorage.getAudio(id);
        const channel = this.getChannel(track.channel);

        if(loop) {
            assetStorage.setAudio(id, channel.loop(track));
        } else {
            assetStorage.setAudio(id, channel.play(track));
        }
    }

    public pause(id: string)
    {
        const track = assetStorage.getAudio(id);

        if(track.source && track.startedAt) {
            track.source.stop();

            track.offset = this.context.currentTime - track.startedAt;
            delete track.source;

            assetStorage.setAudio(id, track);
        }
    }

    public stop(id: string)
    {
        const track = assetStorage.getAudio(id);
        
        if(track.source) {
            track.source.stop();
        }

        delete track.offset;
        delete track.startedAt;
        delete track.source;

        assetStorage.setAudio(id, track);
    }

    public volume(volume: number, channel?: string)
    {
        if(channel) {
            const audioChannel = this.getChannel(channel);
            audioChannel.setVolume(volume);
        } else {
            this.setVolume(volume);
        }
    }

    private setVolume(volume: number)
    {
        if(volume < 0 || volume > 100) {
            throw new RangeError("volume must be percentage");
        }

        const value = this.masterVolume.gain.minValue + (volume / 100) * (this.masterVolume.gain.maxValue - this.masterVolume.gain.minValue);

        this.masterVolume.gain.value = value;
    }


    public addChannel(name: string): this
    {
        if(this.channels.has(name)) {
            throw new GameError(`Channel ${name} already exists`);
        }

        const channel = new AudioChannel(this.context);
        channel.connect(this.masterVolume);

        this.channels.set(name, channel);
        return this;
    }

    public removeChannel(name: string): this
    {
        this.channels.delete(name);
        return this;
    }

    private getChannel(name: string): AudioChannel
    {
        const channel = this.channels.get(name);

        if(channel === undefined) {
            throw new GameError(`Channel ${name} does not exist`);
        }

        return channel;
    }
}