export class AudioChannel
{
    private context: AudioContext;
    private volume: GainNode;


    constructor(context: AudioContext)
    {
        this.context = context;
        this.volume = this.context.createGain();
    }


    public play(buffer: AudioBuffer)
    {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.volume);
        source.start();
    }

    public connect(node: AudioNode)
    {
        this.volume.connect(node);
    }
}