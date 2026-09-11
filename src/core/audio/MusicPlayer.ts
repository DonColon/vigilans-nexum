import { AudioChannel } from "@/core/audio/AudioChannel";
import { AudioClip } from "@/core/audio/AudioClip";
import { AudioVoice } from "@/core/audio/AudioVoice";

export interface MusicOptions {
	/** Seconds the outgoing track fades down and the new one up, together. Zero cuts straight over. */
	crossfade?: number;
	/** Loudness of the track, 0-100. */
	volume?: number;
	/** Music loops unless told otherwise - a one-off sting says `false`. */
	loop?: boolean;
	/** Where the loop wraps back to, in seconds - the end of an intro that plays once. */
	loopStart?: number;
	/** Where the loop wraps from, in seconds. Zero means the end of the track. */
	loopEnd?: number;
}

/**
 * The one track the game is playing at a time, and how one track hands over
 * to the next. Map, menu and battle each want their own theme, and the way
 * between them is a crossfade: the old theme is ramped down while the new one
 * ramps up over the same seconds, then the old one is dropped.
 *
 * A player only ever has one *current* voice. Whatever is fading out is not
 * it any more - it belongs to the channel until its fade ends, and nothing
 * here needs to hold on to it.
 */
export class MusicPlayer {
	private readonly channel: AudioChannel;
	private current: AudioVoice | null = null;

	constructor(channel: AudioChannel) {
		this.channel = channel;
	}

	public getChannel(): AudioChannel {
		return this.channel;
	}

	/** The track playing or paused right now, if any. */
	public getCurrent(): AudioVoice | null {
		return this.current;
	}

	public isPlaying(): boolean {
		return this.current?.isPlaying() ?? false;
	}

	/** Starts a track, replacing whatever was playing. The same clip asked for again keeps playing untouched. */
	public play(clip: AudioClip, options: MusicOptions = {}): AudioVoice {
		if (this.current && this.current.getClip() === clip && this.current.getState() !== "stopped") {
			return this.current.resume();
		}

		const crossfade = Math.max(options.crossfade ?? 0, 0);
		const volume = options.volume ?? 100;

		this.stop(crossfade);

		const voice = this.channel.play(clip, {
			volume: crossfade > 0 ? 0 : volume,
			loop: options.loop ?? true,
			loopStart: options.loopStart,
			loopEnd: options.loopEnd
		});

		if (crossfade > 0) {
			voice.fade(volume, crossfade);
		}

		this.current = voice;
		return voice;
	}

	/** Ends the current track, with a fade-out if asked for. */
	public stop(fadeSeconds: number = 0): void {
		const current = this.current;

		this.current = null;

		if (current) {
			current.stop(fadeSeconds);
		}
	}

	public pause(): void {
		this.current?.pause();
	}

	public resume(): void {
		this.current?.resume();
	}
}
