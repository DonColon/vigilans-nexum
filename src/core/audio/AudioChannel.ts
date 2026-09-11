import { AudioTrack } from "@/core/audio/AudioTrack";
import { gainFromPercentage, percentageFromGain } from "@/core/audio/AudioVolume";

export class AudioChannel {
	private context: AudioContext;
	private volume: GainNode;

	constructor(context: AudioContext) {
		this.context = context;
		this.volume = this.context.createGain();
	}

	public play(track: AudioTrack): AudioTrack {
		const source = this.context.createBufferSource();
		source.buffer = track.buffer;
		source.connect(this.volume);

		track.startedAt = this.context.currentTime;

		if (track.offset) {
			source.start(0, track.offset % track.buffer.duration);
		} else {
			source.start();
		}

		track.source = source;
		return track;
	}

	public loop(track: AudioTrack): AudioTrack {
		const source = this.context.createBufferSource();
		source.buffer = track.buffer;
		source.loop = true;
		source.connect(this.volume);

		track.startedAt = this.context.currentTime;

		if (track.offset) {
			source.start(0, track.offset % track.buffer.duration);
		} else {
			source.start();
		}

		track.source = source;
		return track;
	}

	/** Sets this channel's loudness, 0 (silent) to 100 (as recorded). Out of range is clamped. */
	public setVolume(volume: number) {
		this.volume.gain.value = gainFromPercentage(volume);
	}

	/** What this channel is currently set to, as a percentage. */
	public getVolume(): number {
		return percentageFromGain(this.volume.gain.value);
	}

	public connect(node: AudioNode) {
		this.volume.connect(node);
	}
}
