import { AudioTrack } from "./AudioTrack";

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

	public setVolume(volume: number) {
		if (volume < 0 || volume > 100) {
			throw new RangeError("volume must be percentage");
		}

		const value = this.volume.gain.minValue + (volume / 100) * (this.volume.gain.maxValue - this.volume.gain.minValue);

		this.volume.gain.value = value;
	}

	public connect(node: AudioNode) {
		this.volume.connect(node);
	}
}
