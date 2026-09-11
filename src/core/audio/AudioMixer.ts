import { GameError } from "@/core/GameError";
import { UserGestures } from "@/core/UserGestures";
import { AudioChannel } from "@/core/audio/AudioChannel";
import { gainFromPercentage, rampGain, VOLUME_RAMP_SECONDS } from "@/core/audio/AudioVolume";

/**
 * The one `AudioContext` the game owns, and the graph hanging off it: every
 * channel feeds a master gain that feeds the speakers. Decoding goes through
 * here too - a browser only allows a handful of contexts per page, and a buffer
 * decoded by the context that plays it never needs copying.
 *
 * This is the Web Audio side of the audio system and nothing else: it knows
 * nodes, not clips, and it is not a service. The `AudioDevice` is what the
 * game talks to.
 */
export class AudioMixer {
	private readonly context: AudioContext;
	private readonly master: GainNode;
	private readonly channels = new Map<string, AudioChannel>();

	private level = 100;
	private muted = false;
	private unlocked = false;
	private disposed = false;

	/**
	 * A browser will not let an AudioContext start until the player has interacted
	 * with the page, so the first gesture of any kind resumes it. The handler is
	 * kept on the instance because taking a listener off needs the very function
	 * that was added - a fresh arrow removes nothing, and would leave one listener
	 * per gesture behind for the life of the page.
	 */
	private readonly unlockListener = () => this.unlock();

	/**
	 * A hidden tab gets no animation frames, so the game loop is frozen while
	 * the music would play on - and a suspended context also costs nothing
	 * in the background. Resumed on return, but only once the player has
	 * unlocked audio at all; before that the gesture listeners do the resuming.
	 */
	private readonly visibilityListener = () => {
		if (document.hidden) {
			this.suspend();
		} else if (this.unlocked) {
			this.resume();
		}
	};

	constructor(context: AudioContext = new AudioContext(), suspendWhenHidden: boolean = true) {
		this.context = context;
		this.master = context.createGain();
		this.master.connect(context.destination);

		for (const userGesture of UserGestures) {
			document.addEventListener(userGesture, this.unlockListener);
		}

		if (suspendWhenHidden) {
			document.addEventListener("visibilitychange", this.visibilityListener);
		}
	}

	private unlock() {
		if (this.context.state !== "suspended") {
			this.onUnlocked();
			return;
		}

		// Resuming is asynchronous: the state is still "suspended" on the line
		// after, so the listeners come off once it has actually gone through.
		this.context.resume().then(
			() => this.onUnlocked(),
			() => undefined
		);
	}

	private onUnlocked() {
		this.unlocked = true;

		for (const userGesture of UserGestures) {
			document.removeEventListener(userGesture, this.unlockListener);
		}
	}

	/** Whether the player's first gesture has let the context run yet. */
	public isUnlocked(): boolean {
		return this.unlocked;
	}

	public isRunning(): boolean {
		return this.context.state === "running";
	}

	public get currentTime(): number {
		return this.context.currentTime;
	}

	public decode(data: ArrayBuffer): Promise<AudioBuffer> {
		return this.context.decodeAudioData(data);
	}

	/** Halts the clock and every voice with it - what a hidden tab or a pause screen wants. */
	public suspend(): Promise<void> {
		if (this.context.state !== "running") {
			return Promise.resolve();
		}

		return this.context.suspend();
	}

	public resume(): Promise<void> {
		if (this.context.state !== "suspended") {
			return Promise.resolve();
		}

		return this.context.resume();
	}

	public addChannel(name: string): AudioChannel {
		if (this.channels.has(name)) {
			throw new GameError(`Channel ${name} already exists`);
		}

		const channel = new AudioChannel(this.context, name);
		channel.connect(this.master);

		this.channels.set(name, channel);
		return channel;
	}

	/** Stops whatever is on the channel and takes it off the graph. */
	public removeChannel(name: string): void {
		const channel = this.channels.get(name);

		if (channel) {
			channel.dispose();
			this.channels.delete(name);
		}
	}

	public getChannel(name: string): AudioChannel {
		const channel = this.channels.get(name);

		if (channel === undefined) {
			throw new GameError(`Channel ${name} does not exist`);
		}

		return channel;
	}

	public hasChannel(name: string): boolean {
		return this.channels.has(name);
	}

	public getChannels(): AudioChannel[] {
		return [...this.channels.values()];
	}

	public getChannelNames(): string[] {
		return [...this.channels.keys()];
	}

	/** Sets the loudness everything runs through, 0-100. Out of range is clamped. */
	public setMasterVolume(volume: number): void {
		this.level = Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 100) : 100;

		if (!this.muted) {
			rampGain(this.master.gain, gainFromPercentage(this.level), this.context.currentTime, VOLUME_RAMP_SECONDS);
		}
	}

	public getMasterVolume(): number {
		return this.level;
	}

	public muteMaster(): void {
		if (this.muted) {
			return;
		}

		this.muted = true;
		rampGain(this.master.gain, 0, this.context.currentTime, VOLUME_RAMP_SECONDS);
	}

	public unmuteMaster(): void {
		if (!this.muted) {
			return;
		}

		this.muted = false;
		rampGain(this.master.gain, gainFromPercentage(this.level), this.context.currentTime, VOLUME_RAMP_SECONDS);
	}

	public isMasterMuted(): boolean {
		return this.muted;
	}

	/** Tears the whole graph down and closes the context. The mixer is done after this. */
	public dispose(): Promise<void> {
		if (this.disposed) {
			return Promise.resolve();
		}

		this.disposed = true;

		for (const userGesture of UserGestures) {
			document.removeEventListener(userGesture, this.unlockListener);
		}

		document.removeEventListener("visibilitychange", this.visibilityListener);

		for (const channel of this.channels.values()) {
			channel.dispose();
		}

		this.channels.clear();
		this.master.disconnect();

		return this.context.close();
	}
}
