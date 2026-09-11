import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { AudioDevice } from "@/core/audio/AudioDevice";
import { AudioMixer } from "@/core/audio/AudioMixer";
import { GameError } from "@/core/GameError";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { FakeAudioContext, FakeAudioNode, FakeGainNode, fakeClip, gainAfter, pannerAfter } from "./FakeAudioContext";

/**
 * The service the game talks to. It is handed clips by asset id, routes them
 * to the channel they were loaded for, and is the one place the options
 * screen's sliders and the engine's own ducking meet the mixer underneath.
 */
suite("Audio Device Test Suite", () => {
	let context: FakeAudioContext;
	let device: AudioDevice;

	const assets = () => ServiceRegistry.get<AssetStorage>(AssetStorage);

	const blip = fakeClip("sound", 0.2);
	const hit = fakeClip("sound", 0.5);
	const theme = fakeClip("music", 60);
	const line = fakeClip("voice", 3);

	/** The channel gains a source plays through: its channel's duck gain first, then its volume. */
	const channelGains = (index: number) => {
		const duck = pannerAfter(gainAfter(context.sources[index])).outputs.values().next().value as FakeGainNode;
		const volume = duck.outputs.values().next().value as FakeGainNode;
		return { duck: duck.gain, volume: volume.gain };
	};

	beforeEach(() => {
		context = new FakeAudioContext("running");
		device = new AudioDevice({ channels: ["sound", "music", "voice"] }, new AudioMixer(context.asContext()));

		assets().setAudio("blip", blip);
		assets().setAudio("hit", hit);
		assets().setAudio("theme", theme);
		assets().setAudio("line", line);
	});

	afterEach(() => {
		device.dispose();

		for (const id of ["blip", "hit", "theme", "line"]) {
			assets().deleteAudio(id);
		}
	});

	test("The device is the service the registry hands out under its own name", () => {
		expect(ServiceRegistry.has(AudioDevice)).toBe(true);
		expect(ServiceRegistry.get(AudioDevice)).toBeInstanceOf(AudioDevice);
		expect(ServiceRegistry.has("AudioDevice")).toBe(true);
	});

	test("It is built with the channels of its configuration, in that order", () => {
		expect(device.getChannelNames()).toEqual(["sound", "music", "voice"]);
		expect(device.hasChannel("voice")).toBe(true);
		expect(device.hasChannel("ambience")).toBe(false);
	});

	suite("Sounds", () => {
		test("A sound plays on the channel its clip was loaded for and reaches the speakers", () => {
			const voice = device.playSound("blip");

			expect(voice.isPlaying()).toBe(true);
			expect(voice.getClip()).toBe(blip);
			expect(context.lastSource().reaches(context.destination)).toBe(true);
		});

		test("Sounds overlap - the same clip twice is two voices", () => {
			const first = device.playSound("hit");
			const second = device.playSound("hit", { pitch: 1.1, pan: 0.5 });

			expect(first).not.toBe(second);
			expect(context.liveSources()).toHaveLength(2);
			expect(context.lastSource().playbackRate.value).toBe(1.1);
		});

		test("A clip nobody loaded is an error", () => {
			expect(() => device.playSound("silence")).toThrow(GameError);
		});

		test("A clip loaded for a channel the device does not have is an error", () => {
			assets().setAudio("stray", fakeClip("ambience"));

			expect(() => device.playSound("stray")).toThrow(GameError);
			assets().deleteAudio("stray");
		});
	});

	suite("Music", () => {
		test("Music plays looped on the music channel and a new track can crossfade in", () => {
			const first = device.playMusic("theme");

			expect(device.isMusicPlaying()).toBe(true);
			expect(device.getMusic()).toBe(first);
			expect(first.isLooping()).toBe(true);

			assets().setAudio("battle", fakeClip("music", 30));
			device.playMusic("battle", { crossfade: 1 });
			context.advance(1);

			expect(first.getState()).toBe("stopped");
			expect(device.getMusic()?.getClip()).toBe(assets().getAudio("battle"));
			assets().deleteAudio("battle");
		});

		test("Music can be paused, resumed and stopped through the device", () => {
			device.playMusic("theme");
			context.advance(4);

			device.pauseMusic();
			expect(device.isMusicPlaying()).toBe(false);

			device.resumeMusic();
			expect(device.isMusicPlaying()).toBe(true);
			expect(context.lastSource().started?.offset).toBe(4);

			device.stopMusic(2);
			expect(device.getMusic()).toBeNull();
			expect(context.lastSource().stopAt).toBe(6);
		});

		test("Music on a device without a music channel is an error, while sounds still work", () => {
			const quiet = new AudioDevice({ channels: ["sound"] }, new AudioMixer(new FakeAudioContext("running").asContext()));

			expect(() => quiet.playMusic("theme")).toThrow(GameError);
			expect(quiet.isMusicPlaying()).toBe(false);
			quiet.dispose();
		});

		test("The music channel can be renamed in the configuration", () => {
			const bgm = new AudioDevice({ channels: ["sfx", "bgm"], music: "bgm" }, new AudioMixer(context.asContext()));
			assets().setAudio("bgm-theme", fakeClip("bgm", 10));

			expect(bgm.playMusic("bgm-theme").isPlaying()).toBe(true);

			assets().deleteAudio("bgm-theme");
			bgm.dispose();
		});
	});

	suite("Spoken lines", () => {
		test("A line ducks the music while it speaks and brings it back once it is over", () => {
			device.playMusic("theme");
			const music = channelGains(0);

			device.playVoice("line");
			context.advance(0.25);
			expect(music.duck.value).toBeCloseTo(0.3);

			context.advance(3);
			expect(music.duck.target).toBe(1);
			context.advance(0.25);
			expect(music.duck.value).toBe(1);
		});

		test("Music comes back only after the last of several overlapping lines", () => {
			device.playMusic("theme");
			const music = channelGains(0);

			device.playVoice("line");
			context.advance(1);
			device.playVoice("line");
			context.advance(2.5);

			expect(music.duck.target).toBeCloseTo(0.3);

			context.advance(1);
			expect(music.duck.target).toBe(1);
		});

		test("A stopped line releases the duck like a finished one", () => {
			device.playMusic("theme");
			const music = channelGains(0);

			device.playVoice("line").stop();

			expect(music.duck.target).toBe(1);
		});

		test("Ducking follows the configuration - which channels, how far, how fast", () => {
			const custom = new AudioDevice({ channels: ["sound", "music", "voice"], ducking: { channels: ["sound", "music"], level: 10, fade: 1 } }, new AudioMixer(context.asContext()));

			custom.playSound("blip", { loop: true });
			custom.playVoice("line");

			const sound = channelGains(0);
			context.advance(0.5);
			expect(sound.duck.value).toBeCloseTo(0.55);
			context.advance(0.5);
			expect(sound.duck.value).toBeCloseTo(0.1);

			custom.dispose();
		});

		test("A line dropped before the first gesture ducks nothing", () => {
			const locked = new FakeAudioContext("suspended");
			const silent = new AudioDevice({ channels: ["music", "voice"] }, new AudioMixer(locked.asContext()));

			const voice = silent.playVoice("line");

			expect(voice.getState()).toBe("stopped");
			expect(locked.sources).toHaveLength(0);
			silent.dispose();
		});
	});

	suite("Volume", () => {
		test("A volume without a channel is the master's, with one it is that channel's", () => {
			device.setVolume(80);
			device.setVolume(35, "music");

			expect(device.getVolume()).toBe(80);
			expect(device.getVolume("music")).toBe(35);
			expect(device.getVolume("sound")).toBe(100);
		});

		test("A channel that does not exist is an error either way", () => {
			expect(() => device.setVolume(50, "ambience")).toThrow(GameError);
			expect(() => device.getVolume("ambience")).toThrow(GameError);
		});

		test("The channel volume lands on the channel's gain, the master's on the master", () => {
			device.playSound("blip", { loop: true });
			const sound = channelGains(0);

			device.setVolume(50, "sound");
			device.setVolume(25);
			context.advance(0.1);

			expect(sound.volume.value).toBeCloseTo(0.5);

			let master: FakeAudioNode = context.lastSource();

			while (!master.isConnectedTo(context.destination)) {
				master = master.outputs.values().next().value as FakeAudioNode;
			}

			expect((master as FakeGainNode).gain.value).toBeCloseTo(0.25);
		});

		test("Mute and unmute reach the master or a channel and report as such", () => {
			device.mute("sound");
			expect(device.isMuted("sound")).toBe(true);
			expect(device.isMuted()).toBe(false);

			device.mute();
			expect(device.isMuted()).toBe(true);

			device.unmute("sound");
			device.unmute();
			expect(device.isMuted("sound")).toBe(false);
			expect(device.isMuted()).toBe(false);
		});
	});

	suite("Everything at once", () => {
		test("Pausing all holds every voice on every channel, and resuming all carries on", () => {
			const music = device.playMusic("theme");
			const rain = device.playSound("blip", { loop: true });

			device.pauseAll();
			expect(music.getState()).toBe("paused");
			expect(rain.getState()).toBe("paused");

			device.resumeAll();
			expect(music.isPlaying()).toBe(true);
			expect(rain.isPlaying()).toBe(true);
		});

		test("Stopping all ends every voice; stopping a channel ends only that channel's", () => {
			const music = device.playMusic("theme");
			const rain = device.playSound("blip", { loop: true });

			device.stopAll(0, "sound");
			expect(rain.getState()).toBe("stopped");
			expect(music.isPlaying()).toBe(true);

			device.stopAll();
			expect(music.getState()).toBe("stopped");
			expect(device.getMusic()).toBeNull();
		});

		test("Suspend and resume halt and restart the clock underneath", async () => {
			await device.suspend();
			expect(context.state).toBe("suspended");

			await device.resume();
			expect(context.state).toBe("running");
		});
	});

	suite("Channels", () => {
		test("A channel can be added and removed at runtime, and removing the music channel forgets the player", () => {
			device.addChannel("ambience");
			assets().setAudio("wind", fakeClip("ambience"));

			expect(device.playSound("wind").isPlaying()).toBe(true);
			expect(device.getChannelNames()).toContain("ambience");

			device.removeChannel("ambience");
			expect(device.hasChannel("ambience")).toBe(false);

			const music = device.playMusic("theme");
			device.removeChannel("music");
			expect(music.getState()).toBe("stopped");
			expect(device.getMusic()).toBeNull();

			assets().deleteAudio("wind");
		});

		test("Adding a channel twice is an error", () => {
			expect(() => device.addChannel("sound")).toThrow(GameError);
		});
	});

	test("Decoding goes through the device's mixer, on the context that plays the result", async () => {
		const data = new ArrayBuffer(4);

		await device.decode(data);

		expect(context.decoded).toEqual([data]);
	});

	test("A device with no configuration has no channels and still answers", () => {
		const bare = new AudioDevice(undefined, new AudioMixer(new FakeAudioContext().asContext()));

		expect(bare.getChannelNames()).toEqual([]);
		expect(bare.getVolume()).toBe(100);
		expect(bare.isUnlocked()).toBe(false);
		bare.dispose();
	});
});
