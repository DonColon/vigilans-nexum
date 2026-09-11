import { test, expect, suite, beforeEach } from "vitest";
import { AudioChannel } from "@/core/audio/AudioChannel";
import { FakeAudioContext, FakeAudioNode, FakeGainNode, fakeClip, gainAfter, pannerAfter } from "./FakeAudioContext";

/**
 * A mixing bus. What matters here is that it keeps track of the voices on it -
 * so a pause or a mute reaches all of them and a finished one is let go - and
 * that the player's volume and the engine's ducking never write to the same
 * gain.
 */
suite("Audio Channel Test Suite", () => {
	let context: FakeAudioContext;
	let output: FakeAudioNode;
	let channel: AudioChannel;

	const clip = fakeClip("sound", 1);

	/** The two gains behind a voice, in signal order: the channel's duck and its volume. */
	const chain = () => {
		const duck = pannerAfter(gainAfter(context.lastSource())).outputs.values().next().value as FakeGainNode;
		const volume = duck.outputs.values().next().value as FakeGainNode;
		return { duck: duck.gain, volume: volume.gain };
	};

	beforeEach(() => {
		context = new FakeAudioContext("running");
		output = new FakeAudioNode(context);
		channel = new AudioChannel(context.asContext(), "sound");
		channel.connect(output as unknown as AudioNode);
	});

	test("Any number of voices of the same clip play at once, each reaching the output", () => {
		const first = channel.play(clip);
		const second = channel.play(clip);

		expect(first).not.toBe(second);
		expect(first.isPlaying()).toBe(true);
		expect(second.isPlaying()).toBe(true);
		expect(channel.getVoices()).toEqual([first, second]);
		expect(context.sources.every((source) => source.reaches(output))).toBe(true);
	});

	test("A voice drops off the channel when it stops or runs out", () => {
		const stopped = channel.play(clip);
		const finished = channel.play(clip);
		const looping = channel.play(clip, { loop: true });

		stopped.stop();
		context.advance(2);

		expect(channel.getVoices()).toEqual([looping]);
		expect(finished.getState()).toBe("stopped");
	});

	test("Pausing and resuming reach every voice on the channel", () => {
		const one = channel.play(clip, { loop: true });
		const two = channel.play(clip, { loop: true });

		channel.pauseAll();
		expect(one.getState()).toBe("paused");
		expect(two.getState()).toBe("paused");
		expect(channel.getVoices()).toHaveLength(2);

		channel.resumeAll();
		expect(one.isPlaying()).toBe(true);
		expect(two.isPlaying()).toBe(true);
	});

	test("Stopping all ends every voice, with the fade passed along", () => {
		channel.play(clip, { loop: true });
		channel.play(clip, { loop: true });

		channel.stopAll(0.5);

		expect(context.sources.map((source) => source.stopAt)).toEqual([0.5, 0.5]);
		context.advance(0.5);
		expect(channel.getVoices()).toHaveLength(0);
	});

	suite("Volume", () => {
		test("The channel's volume is ramped on its own gain, leaving the voices' gains alone", () => {
			const voice = channel.play(clip, { volume: 80, loop: true });

			channel.setVolume(40);
			context.advance(0.1);

			const { volume } = chain();
			expect(channel.getVolume()).toBe(40);
			expect(volume.value).toBeCloseTo(0.4);
			expect(voice.getVolume()).toBe(80);
			expect(gainAfter(context.lastSource()).gain.value).toBeCloseTo(0.8);
		});

		test("Out of range is clamped rather than thrown", () => {
			channel.setVolume(250);
			expect(channel.getVolume()).toBe(100);

			channel.setVolume(-1);
			expect(channel.getVolume()).toBe(0);

			channel.setVolume(Number.NaN);
			expect(channel.getVolume()).toBe(100);
		});

		test("Muting silences the channel but keeps the slider's value, and unmuting puts it back", () => {
			channel.play(clip, { loop: true });
			channel.setVolume(60);

			channel.mute();
			context.advance(0.1);
			expect(channel.isMuted()).toBe(true);
			expect(channel.getVolume()).toBe(60);
			expect(chain().volume.value).toBe(0);

			channel.unmute();
			context.advance(0.1);
			expect(channel.isMuted()).toBe(false);
			expect(chain().volume.value).toBeCloseTo(0.6);
		});

		test("A volume set while muted is remembered and applied on unmute, not before", () => {
			channel.play(clip, { loop: true });

			channel.mute();
			channel.setVolume(30);
			context.advance(0.1);
			expect(chain().volume.value).toBe(0);

			channel.unmute();
			context.advance(0.1);
			expect(chain().volume.value).toBeCloseTo(0.3);
		});
	});

	suite("Ducking", () => {
		test("Ducking dips a gain of its own, so the player's volume is untouched and comes back exactly", () => {
			channel.play(clip, { loop: true });
			channel.setVolume(40);

			channel.duckTo(25, 1);
			context.advance(0.5);
			expect(chain().duck.value).toBeCloseTo(0.625);
			context.advance(0.5);
			expect(chain().duck.value).toBeCloseTo(0.25);
			expect(chain().volume.value).toBeCloseTo(0.4);
			expect(channel.getVolume()).toBe(40);

			channel.unduck(1);
			context.advance(1);
			expect(chain().duck.value).toBe(1);
		});
	});

	test("Disposing stops every voice and takes the channel off the output", () => {
		const voice = channel.play(clip, { loop: true });

		channel.dispose();

		expect(voice.getState()).toBe("stopped");
		expect(channel.getVoices()).toHaveLength(0);
		expect(context.lastSource().reaches(output)).toBe(false);
	});
});
