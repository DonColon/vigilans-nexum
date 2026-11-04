import { AudioClip } from "@/core/audio/AudioClip";
import { gainFromPercentage, rampGain, VOLUME_RAMP_SECONDS } from "@/core/audio/AudioVolume";

export interface VoiceOptions {
	/** Loudness of this one playback, 0-100, on top of whatever its channel is set to. */
	volume?: number;
	/** Playback rate: 1 is as recorded, 1.05 a touch higher and quicker. Handy for un-robotic repeated hits. */
	pitch?: number;
	/** Stereo position, -1 (hard left) to 1 (hard right). A unit's map column, roughly. */
	pan?: number;
	/** Whether the clip wraps around when it reaches the end. */
	loop?: boolean;
	/** Where in the clip, in seconds, a loop wraps back to - an intro that only plays once ends here. */
	loopStart?: number;
	/** Where in the clip, in seconds, a loop wraps from. Zero means the very end. */
	loopEnd?: number;
}

export type VoiceState = "idle" | "playing" | "paused" | "stopped";

/**
 * One playback of a clip. A voice owns the source node that plays the samples
 * and a gain and panner of its own, so fading or panning one hit leaves every
 * other hit alone; the channel the voice sits on only hears the sum.
 *
 * Pausing stops the source - an `AudioBufferSourceNode` can only ever be
 * started once - and remembers how far into the clip it got, so resuming builds
 * a new source that starts there. The offset accumulates across pauses:
 * pausing, resuming and pausing again picks up where the *second* run left
 * off, not the first.
 *
 * A voice that finishes on its own (a one-shot reaching its end) moves to
 * `stopped` and tells whoever is listening via `onStopped`, so a channel can
 * forget about it. The same happens on `stop()`; the callback fires once either
 * way.
 */
export class AudioVoice {
	private readonly context: BaseAudioContext;
	private readonly clip: AudioClip;
	private readonly gain: GainNode;
	private readonly panner: StereoPannerNode;
	private readonly options: VoiceOptions;

	private source: AudioBufferSourceNode | null = null;
	private state: VoiceState = "idle";

	/** The loudness this voice was last asked for, as a percentage - what a ramp is heading to. */
	private volume: number;
	/** Context time the current source was started at - only meaningful while playing. */
	private startedAt = 0;
	/** Seconds into the clip the current (or next) source starts from. */
	private offset = 0;

	/** Called once, when the voice is stopped or finishes on its own. */
	public onStopped: ((voice: AudioVoice) => void) | null = null;

	constructor(context: BaseAudioContext, clip: AudioClip, output: AudioNode, options: VoiceOptions = {}) {
		this.context = context;
		this.clip = clip;
		this.options = { ...options };
		this.volume = options.volume ?? 100;

		this.gain = context.createGain();
		this.gain.gain.value = gainFromPercentage(this.volume);

		this.panner = context.createStereoPanner();
		this.panner.pan.value = clampPan(options.pan ?? 0);

		this.gain.connect(this.panner);
		this.panner.connect(output);
	}

	public getClip(): AudioClip {
		return this.clip;
	}

	public getState(): VoiceState {
		return this.state;
	}

	public isPlaying(): boolean {
		return this.state === "playing";
	}

	public isLooping(): boolean {
		return this.options.loop === true;
	}

	/**
	 * Starts, or resumes, playback from the remembered offset.
	 *
	 * A source started while the context is not running does not play - it
	 * queues, and every queued source fires the instant the context resumes.
	 * Before the first user gesture that is a burst of every cursor blip the
	 * player never heard, so a one-shot in that situation is simply dropped.
	 * A loop is let through: the music that should start on the title screen
	 * is exactly what ought to begin the moment the player touches something.
	 */
	public play(): this {
		if (this.state === "playing" || this.state === "stopped") {
			return this;
		}

		if (this.context.state !== "running" && !this.isLooping()) {
			this.finish();
			return this;
		}

		const source = this.context.createBufferSource();
		source.buffer = this.clip.buffer;
		source.playbackRate.value = this.options.pitch ?? 1;

		if (this.options.loop) {
			source.loop = true;
			source.loopStart = this.options.loopStart ?? 0;
			source.loopEnd = this.options.loopEnd ?? 0;
		}

		// Only the source that is still current may end the voice: pausing stops
		// the old one, and its `ended` must not tear down the run that replaced it.
		source.onended = () => {
			if (this.source === source) {
				this.finish();
			}
		};

		source.connect(this.gain);
		source.start(0, this.offset % this.clip.buffer.duration);

		this.source = source;
		this.startedAt = this.context.currentTime;
		this.state = "playing";

		return this;
	}

	/** Holds the voice where it is; `play()` (or `resume()`) carries on from there. */
	public pause(): this {
		if (this.state !== "playing" || !this.source) {
			return this;
		}

		this.offset = this.position();
		this.state = "paused";

		this.detachSource();
		return this;
	}

	public resume(): this {
		return this.play();
	}

	/**
	 * Ends the voice for good. With a fade the sound is ramped down over that
	 * many seconds and the source stopped at the end of the ramp, rather than
	 * cut off mid-sample with a click. Once a fade-out is under way the voice
	 * counts as stopped; a second `stop()` lets the fade run its course.
	 */
	public stop(fadeSeconds: number = 0): this {
		if (this.state === "stopped") {
			return this;
		}

		if (this.state === "playing" && this.source && fadeSeconds > 0) {
			const now = this.context.currentTime;

			rampGain(this.gain.gain, 0, now, fadeSeconds);
			this.volume = 0;
			// Spoken for from this moment - nothing may pause or restart a fade-out -
			// but the source keeps its `ended`: it runs out the ramp, then fires,
			// and that is what tears the voice down and tells the listener. So the
			// channel hears about it once the sound is actually gone.
			this.state = "stopped";
			this.source.stop(now + fadeSeconds);
			return this;
		}

		this.finish();
		return this;
	}

	/** Where in the clip playback is, in seconds. */
	public position(): number {
		if (this.state !== "playing") {
			return this.offset;
		}

		const elapsed = (this.context.currentTime - this.startedAt) * (this.options.pitch ?? 1);
		const position = this.offset + elapsed;
		const duration = this.clip.buffer.duration;

		return this.isLooping() ? position % duration : Math.min(position, duration);
	}

	/** Sets this playback's own loudness, 0-100, smoothed over a few milliseconds. */
	public setVolume(volume: number): this {
		return this.fade(volume, VOLUME_RAMP_SECONDS);
	}

	public getVolume(): number {
		return this.volume;
	}

	/** Ramps this playback's loudness to a percentage over some seconds - a fade-in is `fade(100, 2)` on a voice started at volume 0. */
	public fade(volume: number, seconds: number): this {
		this.volume = Math.min(Math.max(volume, 0), 100);
		rampGain(this.gain.gain, gainFromPercentage(this.volume), this.context.currentTime, seconds);
		return this;
	}

	public setPan(pan: number): this {
		this.panner.pan.value = clampPan(pan);
		return this;
	}

	public getPan(): number {
		return this.panner.pan.value;
	}

	public setPitch(pitch: number): this {
		// The position so far was covered at the old rate; bank it before the
		// rate changes so `position()` keeps adding up.
		if (this.state === "playing") {
			this.offset = this.position();
			this.startedAt = this.context.currentTime;
		}

		this.options.pitch = pitch;

		if (this.source) {
			this.source.playbackRate.value = pitch;
		}

		return this;
	}

	public getPitch(): number {
		return this.options.pitch ?? 1;
	}

	/** Final: the source is dropped, the nodes disconnected and the listener told. */
	private finish() {
		if (this.state === "playing") {
			this.offset = this.position();
		}

		this.state = "stopped";
		this.detachSource();

		this.gain.disconnect();
		this.panner.disconnect();

		if (this.onStopped) {
			const listener = this.onStopped;
			this.onStopped = null;
			listener(this);
		}
	}

	private detachSource() {
		const source = this.source;

		if (!source) {
			return;
		}

		this.source = null;
		source.onended = null;
		source.stop();
		source.disconnect();
	}
}

function clampPan(pan: number): number {
	return Number.isFinite(pan) ? Math.min(Math.max(pan, -1), 1) : 0;
}
