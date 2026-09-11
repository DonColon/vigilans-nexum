import { GameError } from "@/core/GameError";
import { UserGestures } from "@/core/UserGestures";
import { AudioChannel } from "@/core/audio/AudioChannel";
import { gainFromPercentage, percentageFromGain } from "@/core/audio/AudioVolume";
import { GameCoreService } from "@/core/service/GameCoreService";
import { AssetStorage } from "@/core/assets/AssetStorage";

export interface AudioConfiguration {
	channels: string[];
}

@GameCoreService()
export class AudioDevice {
	private context: AudioContext;
	private channels: Map<string, AudioChannel>;
	private masterVolume: GainNode;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	constructor(config?: AudioConfiguration) {
		this.context = new AudioContext();
		this.channels = new Map<string, AudioChannel>();

		this.masterVolume = this.context.createGain();
		this.masterVolume.connect(this.context.destination);

		if (config) {
			for (const channel of config.channels) {
				this.addChannel(channel);
			}
		}

		this.start();
	}

	/**
	 * A browser will not let an AudioContext start until the player has interacted
	 * with the page, so the first gesture of any kind resumes it. The handler is
	 * kept on the instance because taking a listener off needs the very function
	 * that was added - a fresh arrow removes nothing, and would leave one listener
	 * per gesture behind for the life of the page.
	 */
	private readonly unlockListener = () => this.unlock();

	private start() {
		for (const userGesture of UserGestures) {
			document.addEventListener(userGesture, this.unlockListener);
		}
	}

	private unlock() {
		if (this.context.state === "suspended") {
			this.context.resume();
		}

		if (this.context.state === "running") {
			for (const userGesture of UserGestures) {
				document.removeEventListener(userGesture, this.unlockListener);
			}
		}
	}

	public play(id: string, loop: boolean = false) {
		const track = this.assetStorage.getAudio(id);
		const channel = this.getChannel(track.channel);

		if (loop) {
			this.assetStorage.setAudio(id, channel.loop(track));
		} else {
			this.assetStorage.setAudio(id, channel.play(track));
		}
	}

	public pause(id: string) {
		const track = this.assetStorage.getAudio(id);

		if (track.source && track.startedAt) {
			track.source.stop();

			track.offset = this.context.currentTime - track.startedAt;
			delete track.source;

			this.assetStorage.setAudio(id, track);
		}
	}

	public stop(id: string) {
		const track = this.assetStorage.getAudio(id);

		if (track.source) {
			track.source.stop();
		}

		delete track.offset;
		delete track.startedAt;
		delete track.source;

		this.assetStorage.setAudio(id, track);
	}

	/**
	 * Sets a loudness, 0 (silent) to 100 (as recorded) - one channel's when it is
	 * named, the master everything runs through when it is not. Out of range is
	 * clamped rather than thrown: a volume slider should not be able to crash the
	 * game.
	 */
	public volume(volume: number, channel?: string) {
		if (channel) {
			this.getChannel(channel).setVolume(volume);
		} else {
			this.masterVolume.gain.value = gainFromPercentage(volume);
		}
	}

	/** What a channel, or the master, is currently set to - as a percentage. */
	public getVolume(channel?: string): number {
		return channel ? this.getChannel(channel).getVolume() : percentageFromGain(this.masterVolume.gain.value);
	}

	/** The channels this device was built with - what an options screen offers a row for. */
	public getChannelNames(): string[] {
		return [...this.channels.keys()];
	}

	public addChannel(name: string): this {
		if (this.channels.has(name)) {
			throw new GameError(`Channel ${name} already exists`);
		}

		const channel = new AudioChannel(this.context);
		channel.connect(this.masterVolume);

		this.channels.set(name, channel);
		return this;
	}

	public removeChannel(name: string): this {
		this.channels.delete(name);
		return this;
	}

	private getChannel(name: string): AudioChannel {
		const channel = this.channels.get(name);

		if (channel === undefined) {
			throw new GameError(`Channel ${name} does not exist`);
		}

		return channel;
	}
}
