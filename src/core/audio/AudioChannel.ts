export class AudioChannel
{
    private context: AudioContext;
    private volume: GainNode;


    constructor(context: AudioContext)
    {
        this.context = context;
        this.volume = this.context.createGain();
    }


    public play(buffer: AudioBuffer, offset?: number): AudioBufferSourceNode
    {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.volume);

        if(offset) {
            source.start(0, offset % buffer.duration);
        } else {
            source.start();
        }
        
        return source;
    }

    public loop(buffer: AudioBuffer, offset?: number): AudioBufferSourceNode
    {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(this.volume);

        if(offset) {
            source.start(0, offset % buffer.duration);
        } else {
            source.start();
        }
        
        return source;
    }

    public setVolume(volume: number)
    {
        if(volume < 0 || volume > 100) {
            throw new RangeError("volume must be percentage");
        }

        const value = this.volume.gain.minValue + (volume / 100) * (this.volume.gain.maxValue - this.volume.gain.minValue);

        this.volume.gain.value = value;
    }

    public connect(node: AudioNode)
    {
        this.volume.connect(node);
    }
}