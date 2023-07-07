import { GameError } from "core/GameError";
import { UserGestures } from "./UserGestures";
import { AudioChannel } from "./AudioChannel";
import { AudioTrack } from "./AudioTrack";


export class AudioDevice
{
    private context: AudioContext;
    private channels: Map<string, AudioChannel>;
    private tracks: Map<string, AudioTrack>;
    private masterVolume: GainNode;


    constructor()
    {
        this.context = new AudioContext();
        this.channels = new Map<string, AudioChannel>();
        this.tracks = new Map<string, AudioTrack>();

        this.masterVolume = this.context.createGain();
        this.masterVolume.connect(this.context.destination);

        eventSystem.subscribe("channelAdded", event => this.addChannel(event.channel));
        eventSystem.subscribe("audioLoaded", event => this.addTracks(event.tracks));

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
        const track = this.getTrack(id);
        const channel = this.getChannel(track.channel);

        track.startedAt = this.context.currentTime;

        if(loop) {
            track.source = channel.loop(track.buffer, track.offset);
        } else {
            track.source = channel.play(track.buffer, track.offset);
        }

        this.tracks.set(id, track);
    }

    public pause(id: string)
    {
        const track = this.getTrack(id);

        if(track.source && track.startedAt) {
            track.offset = this.context.currentTime - track.startedAt;
            track.source.stop();
            this.tracks.set(id, track);
        }
    }

    public stop(id: string)
    {
        const track = this.getTrack(id);
        if(track.source) track.source.stop();
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

    private addTracks(tracks: Map<string, AudioTrack>)
    {
        this.tracks = new Map<string, AudioTrack>([...this.tracks, ...tracks]);
    }

    private getTrack(id: string): AudioTrack
    {
        const track = this.tracks.get(id);

        if(track === undefined) {
            throw new GameError(`Track ${id} does not exist`);
        }

        return track;
    }
}