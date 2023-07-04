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


    public play(id: string)
    {
        const track = this.getTrack(id);
        const channel = this.getChannel(track.channel);
        channel.play(track.buffer);
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