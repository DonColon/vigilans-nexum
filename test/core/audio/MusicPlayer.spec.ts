import { test, expect, suite, beforeEach } from "vitest";
import { AudioChannel } from "@/core/audio/AudioChannel";
import { MusicPlayer } from "@/core/audio/MusicPlayer";
import { FakeAudioContext, FakeAudioNode, fakeClip, gainAfter } from "./FakeAudioContext";

/**
 * One track at a time, and the way from one to the next. A crossfade is the
 * thing to get right: the old theme ramps down while the new one ramps up over
 * the same seconds, and the old one is gone at the end of it - not cut, not
 * left playing underneath.
 */
suite("Music Player Test Suite", () => {
	let context: FakeAudioContext;
	let channel: AudioChannel;
	let player: MusicPlayer;

	const mapTheme = fakeClip("music", 60);
	const battleTheme = fakeClip("music", 45);

	beforeEach(() => {
		context = new FakeAudioContext("running");
		channel = new AudioChannel(context.asContext(), "music");
		channel.connect(new FakeAudioNode(context) as unknown as AudioNode);
		player = new MusicPlayer(channel);
	});

	test("A track plays looped on the music channel unless told otherwise", () => {
		const theme = player.play(mapTheme);

		expect(player.isPlaying()).toBe(true);
		expect(player.getCurrent()).toBe(theme);
		expect(theme.isLooping()).toBe(true);
		expect(context.lastSource().loop).toBe(true);
		expect(channel.getVoices()).toEqual([theme]);

		player.play(battleTheme, { loop: false, loopStart: 0, loopEnd: 0 });
		expect(context.lastSource().loop).toBe(false);
	});

	test("Loop points and volume are handed to the voice", () => {
		player.play(mapTheme, { loopStart: 8, loopEnd: 56, volume: 70 });

		expect(context.lastSource().loopStart).toBe(8);
		expect(context.lastSource().loopEnd).toBe(56);
		expect(player.getCurrent()?.getVolume()).toBe(70);
	});

	test("A new track cuts straight over when no crossfade is asked for", () => {
		const first = player.play(mapTheme);
		const second = player.play(battleTheme);

		expect(first.getState()).toBe("stopped");
		expect(second.isPlaying()).toBe(true);
		expect(channel.getVoices()).toEqual([second]);
	});

	test("A crossfade ramps the old track down and the new one up together, and drops the old one after", () => {
		const first = player.play(mapTheme);
		context.advance(10);

		const second = player.play(battleTheme, { crossfade: 2 });
		const outgoing = gainAfter(context.sources[0]).gain;
		const incoming = gainAfter(context.lastSource()).gain;

		expect(player.getCurrent()).toBe(second);
		expect(incoming.value).toBe(0);
		expect(channel.getVoices()).toEqual([first, second]);

		context.advance(1);
		expect(outgoing.value).toBeCloseTo(0.5);
		expect(incoming.value).toBeCloseTo(0.5);

		context.advance(1);
		expect(outgoing.value).toBe(0);
		expect(incoming.value).toBe(1);
		expect(first.getState()).toBe("stopped");
		expect(channel.getVoices()).toEqual([second]);
	});

	test("A crossfade lands on the volume the new track asked for", () => {
		player.play(mapTheme);
		player.play(battleTheme, { crossfade: 1, volume: 60 });

		context.advance(1);
		expect(gainAfter(context.lastSource()).gain.value).toBeCloseTo(0.6);
	});

	test("Asking for the track that is already playing keeps it playing untouched", () => {
		const theme = player.play(mapTheme);
		context.advance(5);

		expect(player.play(mapTheme)).toBe(theme);
		expect(context.sources).toHaveLength(1);
		expect(theme.position()).toBe(5);
	});

	test("Asking for the paused track resumes it", () => {
		const theme = player.play(mapTheme);
		context.advance(5);
		player.pause();

		expect(player.isPlaying()).toBe(false);
		expect(player.play(mapTheme)).toBe(theme);
		expect(player.isPlaying()).toBe(true);
		expect(context.lastSource().started?.offset).toBe(5);
	});

	test("A track that ran out is started over when asked for again", () => {
		const sting = player.play(battleTheme, { loop: false });
		context.advance(45);

		expect(sting.getState()).toBe("stopped");
		expect(player.play(battleTheme, { loop: false })).not.toBe(sting);
		expect(player.isPlaying()).toBe(true);
	});

	test("Stopping ends the track, with a fade when asked, and leaves nothing current", () => {
		player.play(mapTheme);
		player.stop(3);

		expect(player.getCurrent()).toBeNull();
		expect(player.isPlaying()).toBe(false);
		expect(context.lastSource().stopAt).toBe(3);

		player.stop();
		player.pause();
		player.resume();
		expect(player.getCurrent()).toBeNull();
	});

	test("Pause and resume hold the one current track", () => {
		const theme = player.play(mapTheme);

		player.pause();
		expect(theme.getState()).toBe("paused");

		player.resume();
		expect(theme.isPlaying()).toBe(true);
	});
});
