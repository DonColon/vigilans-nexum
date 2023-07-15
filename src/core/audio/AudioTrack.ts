export interface AudioTrack
{
    buffer: AudioBuffer,
    channel: string,
    source?: AudioBufferSourceNode,
    startedAt?: number,
    offset?: number
}