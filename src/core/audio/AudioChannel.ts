import { AudioClip } from "@/core/audio/AudioClip";
import { AudioVoice, VoiceOptions } from "@/core/audio/AudioVoice";
import { gainFromPercentage, rampGain, VOLUME_RAMP_SECONDS } from "@/core/audio/AudioVolume";

/**
 * A mixing bus every voice of one kind goes through - "sound", "music",
 * "voice" - and what an options screen offers a volume row for.
 *
 * Two gains sit in the chain, `voices -> duck -> volume -> out`, because two
 * different parties drive them. `volume` is the player's: their slider, their
 * mute. `duck` is the engine's: music dips while a line is spoken and comes
 * back up after. Sharing one gain would have the two fight - a duck restoring
 * "100%" over a slider the player had at 40.
 *
 * The channel keeps the voices playing on it so that a mute, a pause or a
 * removal reaches every one of them; a voice drops itself out when it stops.
 */
export class AudioChannel {
	private readonly context: BaseAudioContext;
	private readonly name: string;
	private readonly duck: GainNode;
	private readonly volume: GainNode;
	private readonly voices = new Set<AudioVoice>();

	/** What the player set, kept apart from the gain so a mute can put it back. */
	private level = 100;
	private muted = false;

	constructor(context: BaseAudioContext, name: string) {
		this.context = context;
		this.name = name;

		this.duck = context.createGain();
		this.volume = context.createGain();
		this.duck.connect(this.volume);
	}

	public getName(): string {
		return this.name;
	}

	/** Starts a new voice for a clip on this channel. Any number can play at once. */
	public play(clip: AudioClip, options?: VoiceOptions): AudioVoice {
		const voice = new AudioVoice(this.context, clip, this.duck, options);

		this.voices.add(voice);
		voice.onStopped = () => this.voices.delete(voice);

		return voice.play();
	}

	/** The voices currently on this channel, playing or paused. */
	public getVoices(): AudioVoice[] {
		return [...this.voices];
	}

	public pauseAll(): void {
		for (const voice of this.voices) {
			voice.pause();
		}
	}

	public resumeAll(): void {
		for (const voice of this.voices) {
			voice.resume();
		}
	}

	public stopAll(fadeSeconds: number = 0): void {
		for (const voice of this.voices) {
			voice.stop(fadeSeconds);
		}
	}

	/** Sets this channel's loudness, 0 (silent) to 100 (as recorded). Out of range is clamped. */
	public setVolume(volume: number): void {
		this.level = Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 100) : 100;

		if (!this.muted) {
			rampGain(this.volume.gain, gainFromPercentage(this.level), this.context.currentTime, VOLUME_RAMP_SECONDS);
		}
	}

	/** What this channel is set to, as a percentage - the slider's value, even while muted. */
	public getVolume(): number {
		return this.level;
	}

	public mute(): void {
		if (this.muted) {
			return;
		}

		this.muted = true;
		rampGain(this.volume.gain, 0, this.context.currentTime, VOLUME_RAMP_SECONDS);
	}

	public unmute(): void {
		if (!this.muted) {
			return;
		}

		this.muted = false;
		rampGain(this.volume.gain, gainFromPercentage(this.level), this.context.currentTime, VOLUME_RAMP_SECONDS);
	}

	public isMuted(): boolean {
		return this.muted;
	}

	/** Dips the channel to a percentage of its set volume over some seconds; `unduck` brings it back. */
	public duckTo(percentage: number, seconds: number): void {
		rampGain(this.duck.gain, gainFromPercentage(percentage), this.context.currentTime, seconds);
	}

	public unduck(seconds: number): void {
		rampGain(this.duck.gain, 1, this.context.currentTime, seconds);
	}

	public connect(node: AudioNode): void {
		this.volume.connect(node);
	}

	/** Silences and drops everything: stops every voice and takes the channel off the graph. */
	public dispose(): void {
		this.stopAll();
		this.voices.clear();
		this.duck.disconnect();
		this.volume.disconnect();
	}
}
