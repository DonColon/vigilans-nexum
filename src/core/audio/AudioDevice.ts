import { AssetStorage } from "@/core/assets/AssetStorage";
import { AudioClip } from "@/core/audio/AudioClip";
import { AudioMixer } from "@/core/audio/AudioMixer";
import { AudioVoice, VoiceOptions } from "@/core/audio/AudioVoice";
import { MusicOptions, MusicPlayer } from "@/core/audio/MusicPlayer";
import { GameCoreService } from "@/core/service/GameCoreService";

export interface DuckingConfiguration {
	/** Channels that dip while a spoken line plays - the music, as a rule. */
	channels?: string[];
	/** What they dip to, as a percentage of their set volume. */
	level?: number;
	/** Seconds the dip takes going down and coming back up. */
	fade?: number;
}

export interface AudioConfiguration {
	/** The mixing channels to build - one volume row each on the options screen. A clip names the one it plays on. */
	channels: string[];
	/** The channel `playMusic` drives. Defaults to "music". */
	music?: string;
	/** How `playVoice` makes room for a spoken line. Defaults to dipping the music channel to 30% over a quarter second. */
	ducking?: DuckingConfiguration;
	/** Whether audio halts while the tab is hidden, like the game loop does. Defaults to on. */
	suspendWhenHidden?: boolean;
}

const DEFAULT_MUSIC_CHANNEL = "music";
const DEFAULT_DUCK_LEVEL = 30;
const DEFAULT_DUCK_FADE = 0.25;

/**
 * The audio system as the game sees it: the one service anything that makes
 * a noise talks to. A sound effect, the music, a spoken line and the volume
 * sliders all come through here, by asset id, and nothing outside this folder
 * needs to know a Web Audio node exists.
 *
 * Underneath, the `AudioMixer` owns the context and the channels, an
 * `AudioVoice` is one playback, and the `MusicPlayer` handles one track
 * giving way to the next. What comes back from a `play*` call is the voice,
 * which is the handle to stop, fade or pan that one playback later.
 */
@GameCoreService()
export class AudioDevice {
	private readonly mixer: AudioMixer;
	private readonly musicChannel: string;
	private readonly ducking: Required<DuckingConfiguration>;

	private musicPlayer: MusicPlayer | null = null;

	/** Spoken lines under way right now: the ducked channels come back up when the last one ends. */
	private speaking = 0;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	constructor(config?: AudioConfiguration, mixer?: AudioMixer) {
		this.mixer = mixer ?? new AudioMixer(undefined, config?.suspendWhenHidden ?? true);
		this.musicChannel = config?.music ?? DEFAULT_MUSIC_CHANNEL;
		this.ducking = {
			channels: config?.ducking?.channels ?? [this.musicChannel],
			level: config?.ducking?.level ?? DEFAULT_DUCK_LEVEL,
			fade: config?.ducking?.fade ?? DEFAULT_DUCK_FADE
		};

		for (const channel of config?.channels ?? []) {
			this.mixer.addChannel(channel);
		}
	}

	// ---- Sounds -------------------------------------------------------------

	/**
	 * Plays a clip on the channel it was loaded for. Fire and forget: any
	 * number of sounds overlap, and a finished one cleans itself up. Keep the
	 * voice to stop or fade this particular playback later.
	 */
	public playSound(id: string, options?: VoiceOptions): AudioVoice {
		const clip = this.getClip(id);
		return this.mixer.getChannel(clip.channel).play(clip, options);
	}

	/**
	 * Plays a spoken line and makes room for it: the ducked channels dip while
	 * it speaks and come back up once the last line under way has ended.
	 */
	public playVoice(id: string, options?: VoiceOptions): AudioVoice {
		const voice = this.playSound(id, options);

		if (voice.getState() === "stopped") {
			return voice;
		}

		this.speaking++;
		this.setDucked(true);

		const release = voice.onStopped;
		voice.onStopped = (ended) => {
			release?.(ended);

			this.speaking = Math.max(0, this.speaking - 1);

			if (this.speaking === 0) {
				this.setDucked(false);
			}
		};

		return voice;
	}

	// ---- Music --------------------------------------------------------------

	/** Starts a track on the music channel, crossfading from whatever was playing if asked to. */
	public playMusic(id: string, options?: MusicOptions): AudioVoice {
		return this.music().play(this.getClip(id), options);
	}

	public stopMusic(fadeSeconds: number = 0): void {
		this.musicPlayer?.stop(fadeSeconds);
	}

	public pauseMusic(): void {
		this.musicPlayer?.pause();
	}

	public resumeMusic(): void {
		this.musicPlayer?.resume();
	}

	public isMusicPlaying(): boolean {
		return this.musicPlayer?.isPlaying() ?? false;
	}

	/** The track playing or paused right now, if any. */
	public getMusic(): AudioVoice | null {
		return this.musicPlayer?.getCurrent() ?? null;
	}

	// ---- Everything at once -------------------------------------------------

	/** Holds every voice on every channel where it is - a pause screen. Menu blips still play. */
	public pauseAll(): void {
		for (const channel of this.mixer.getChannels()) {
			channel.pauseAll();
		}
	}

	public resumeAll(): void {
		for (const channel of this.mixer.getChannels()) {
			channel.resumeAll();
		}
	}

	/** Ends every voice - on one channel when named, everywhere when not. */
	public stopAll(fadeSeconds: number = 0, channel?: string): void {
		if (channel) {
			this.mixer.getChannel(channel).stopAll(fadeSeconds);
			return;
		}

		this.musicPlayer?.stop(fadeSeconds);

		for (const each of this.mixer.getChannels()) {
			each.stopAll(fadeSeconds);
		}
	}

	/** Halts the clock itself: nothing plays and nothing advances until `resume`. */
	public suspend(): Promise<void> {
		return this.mixer.suspend();
	}

	public resume(): Promise<void> {
		return this.mixer.resume();
	}

	/** Whether the player's first gesture has let audio run yet. Sounds before that are dropped. */
	public isUnlocked(): boolean {
		return this.mixer.isUnlocked();
	}

	// ---- Volume -------------------------------------------------------------

	/**
	 * Sets a loudness, 0 (silent) to 100 (as recorded) - one channel's when it is
	 * named, the master everything runs through when it is not. Out of range is
	 * clamped rather than thrown: a volume slider should not be able to crash the
	 * game.
	 */
	public setVolume(volume: number, channel?: string): void {
		if (channel) {
			this.mixer.getChannel(channel).setVolume(volume);
		} else {
			this.mixer.setMasterVolume(volume);
		}
	}

	/** What a channel, or the master, is set to - as a percentage, mute or not. */
	public getVolume(channel?: string): number {
		return channel ? this.mixer.getChannel(channel).getVolume() : this.mixer.getMasterVolume();
	}

	public mute(channel?: string): void {
		if (channel) {
			this.mixer.getChannel(channel).mute();
		} else {
			this.mixer.muteMaster();
		}
	}

	public unmute(channel?: string): void {
		if (channel) {
			this.mixer.getChannel(channel).unmute();
		} else {
			this.mixer.unmuteMaster();
		}
	}

	public isMuted(channel?: string): boolean {
		return channel ? this.mixer.getChannel(channel).isMuted() : this.mixer.isMasterMuted();
	}

	// ---- Channels -----------------------------------------------------------

	/** The channels this device was built with - what an options screen offers a row for. */
	public getChannelNames(): string[] {
		return this.mixer.getChannelNames();
	}

	public hasChannel(name: string): boolean {
		return this.mixer.hasChannel(name);
	}

	public addChannel(name: string): this {
		this.mixer.addChannel(name);
		return this;
	}

	/** Stops whatever is on the channel and drops it. */
	public removeChannel(name: string): this {
		if (name === this.musicChannel) {
			this.musicPlayer = null;
		}

		this.mixer.removeChannel(name);
		return this;
	}

	// ---- Loading ------------------------------------------------------------

	/** Turns a fetched file into samples, on the context that will play them. What the AssetLoader calls. */
	public decode(data: ArrayBuffer): Promise<AudioBuffer> {
		return this.mixer.decode(data);
	}

	/** Tears everything down. The device is done after this. */
	public dispose(): Promise<void> {
		this.musicPlayer = null;
		return this.mixer.dispose();
	}

	// ---- Internals ----------------------------------------------------------

	private getClip(id: string): AudioClip {
		return this.assetStorage.getAudio(id);
	}

	private music(): MusicPlayer {
		if (!this.musicPlayer) {
			this.musicPlayer = new MusicPlayer(this.mixer.getChannel(this.musicChannel));
		}

		return this.musicPlayer;
	}

	private setDucked(ducked: boolean): void {
		for (const name of this.ducking.channels) {
			if (!this.mixer.hasChannel(name)) {
				continue;
			}

			const channel = this.mixer.getChannel(name);

			if (ducked) {
				channel.duckTo(this.ducking.level, this.ducking.fade);
			} else {
				channel.unduck(this.ducking.fade);
			}
		}
	}
}
