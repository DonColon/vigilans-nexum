import { test, expect, suite, beforeEach } from "vitest";
import { AudioVoice } from "@/core/audio/AudioVoice";
import { FakeAudioContext, FakeAudioNode, fakeClip, gainAfter, pannerAfter } from "./FakeAudioContext";

/**
 * One playback of a clip, on a fake context whose clock only moves when a test
 * says so. The bugs these exist to keep fixed: a pause that forgot the offset
 * it had resumed from, a finished one-shot that was never cleaned up, and
 * sources started before the first gesture bursting out together on it.
 */
suite("Audio Voice Test Suite", () => {
	let context: FakeAudioContext;
	let output: FakeAudioNode;

	const clip = fakeClip("sound", 2);

	const voice = (options = {}) => new AudioVoice(context.asContext(), clip, output as unknown as AudioNode, options);

	beforeEach(() => {
		context = new FakeAudioContext("running");
		output = new FakeAudioNode(context);
	});

	suite("Playing", () => {
		test("Playing starts a source for the clip from the beginning, wired through the voice's gain and panner to the output", () => {
			const playing = voice().play();
			const source = context.lastSource();

			expect(playing.isPlaying()).toBe(true);
			expect(source.buffer).toBe(clip.buffer);
			expect(source.started).toEqual({ when: 0, offset: 0 });
			expect(source.reaches(output)).toBe(true);
			expect(pannerAfter(gainAfter(source)).isConnectedTo(output)).toBe(true);
		});

		test("Playing again while already playing does nothing", () => {
			const playing = voice().play();
			playing.play();

			expect(context.sources).toHaveLength(1);
		});

		test("A voice takes its volume, pitch and pan from its options", () => {
			voice({ volume: 50, pitch: 1.5, pan: -0.5 }).play();
			const source = context.lastSource();

			expect(gainAfter(source).gain.value).toBe(0.5);
			expect(pannerAfter(gainAfter(source)).pan.value).toBe(-0.5);
			expect(source.playbackRate.value).toBe(1.5);
		});

		test("A loop carries its loop points to the source", () => {
			voice({ loop: true, loopStart: 4, loopEnd: 20 }).play();
			const source = context.lastSource();

			expect(source.loop).toBe(true);
			expect(source.loopStart).toBe(4);
			expect(source.loopEnd).toBe(20);
		});

		test("Pan is clamped to the stereo field", () => {
			const playing = voice({ pan: 7 }).play();

			expect(playing.getPan()).toBe(1);

			playing.setPan(-3);
			expect(playing.getPan()).toBe(-1);

			playing.setPan(Number.NaN);
			expect(playing.getPan()).toBe(0);
		});
	});

	suite("Ending", () => {
		test("A one-shot that runs out ends itself, tells its listener and lets go of its nodes", () => {
			const stopped: AudioVoice[] = [];
			const playing = voice().play();
			playing.onStopped = (ended) => stopped.push(ended);
			const gain = gainAfter(context.lastSource());

			context.advance(1.9);
			expect(playing.getState()).toBe("playing");
			expect(stopped).toHaveLength(0);

			context.advance(0.2);
			expect(playing.getState()).toBe("stopped");
			expect(stopped).toEqual([playing]);
			expect(gain.outputs.size).toBe(0);
		});

		test("Stopping tells the listener exactly once, and a stopped voice cannot be restarted", () => {
			let told = 0;
			const playing = voice().play();
			playing.onStopped = () => told++;

			playing.stop();
			playing.stop();
			context.advance(5);

			expect(playing.getState()).toBe("stopped");
			expect(told).toBe(1);

			playing.play();
			expect(playing.getState()).toBe("stopped");
			expect(context.sources).toHaveLength(1);
		});

		test("Stopping with a fade ramps the voice down and stops the source at the end of the ramp", () => {
			let told = 0;
			const playing = voice({ loop: true }).play();
			playing.onStopped = () => told++;

			playing.stop(1);
			const source = context.lastSource();
			const gain = gainAfter(source).gain;

			expect(playing.getState()).toBe("stopped");
			expect(source.stopAt).toBe(1);
			expect(gain.target).toBe(0);
			expect(told).toBe(0);

			context.advance(0.5);
			expect(gain.value).toBeCloseTo(0.5);
			expect(told).toBe(0);

			context.advance(0.5);
			expect(gain.value).toBe(0);
			expect(told).toBe(1);
		});

		test("A second stop during a fade-out lets the fade run rather than cutting it", () => {
			const playing = voice({ loop: true }).play();

			playing.stop(1);
			playing.stop();

			expect(context.lastSource().stopAt).toBe(1);
			expect(context.lastSource().ended).toBe(false);
		});
	});

	suite("Pausing", () => {
		test("Pausing stops the source and remembers how far the clip got", () => {
			const playing = voice().play();

			context.advance(0.5);
			playing.pause();

			expect(playing.getState()).toBe("paused");
			expect(playing.position()).toBeCloseTo(0.5);
			expect(context.liveSources()).toHaveLength(0);
		});

		test("Resuming starts a fresh source from where the pause left it", () => {
			const playing = voice().play();

			context.advance(0.5);
			playing.pause();
			context.advance(3);
			playing.resume();

			expect(playing.isPlaying()).toBe(true);
			expect(context.sources).toHaveLength(2);
			expect(context.lastSource().started).toEqual({ when: 3.5, offset: 0.5 });
		});

		test("The offset accumulates across pauses instead of restarting from the last resume", () => {
			const playing = voice().play();

			context.advance(0.5);
			playing.pause();
			playing.resume();
			context.advance(0.75);
			playing.pause();

			expect(playing.position()).toBeCloseTo(1.25);

			playing.resume();
			expect(context.lastSource().started?.offset).toBeCloseTo(1.25);
		});

		test("The source a pause discarded cannot end the run that replaced it", () => {
			let told = 0;
			const playing = voice().play();
			playing.onStopped = () => told++;

			context.advance(0.5);
			playing.pause();
			const discarded = context.lastSource();
			playing.resume();

			// A real context fires `ended` on a stopped source a moment later.
			discarded.onended?.call(discarded as unknown as AudioScheduledSourceNode, new Event("ended"));

			expect(playing.isPlaying()).toBe(true);
			expect(told).toBe(0);
		});

		test("A resumed one-shot still ends when the remainder of the clip has played", () => {
			let told = 0;
			const playing = voice().play();
			playing.onStopped = () => told++;

			context.advance(1.5);
			playing.pause();
			playing.resume();
			context.advance(0.4);
			expect(told).toBe(0);

			context.advance(0.2);
			expect(told).toBe(1);
		});

		test("Pausing something that is not playing does nothing", () => {
			const idle = voice();
			idle.pause();

			expect(idle.getState()).toBe("idle");
		});
	});

	suite("Position", () => {
		test("A one-shot's position runs from zero to the end of the clip and no further", () => {
			const playing = voice().play();

			context.advance(1);
			expect(playing.position()).toBe(1);

			context.advance(5);
			expect(playing.position()).toBe(2);
		});

		test("A loop's position wraps around the clip", () => {
			const playing = voice({ loop: true }).play();

			context.advance(2.5);
			expect(playing.position()).toBeCloseTo(0.5);
		});

		test("Pitch scales how much of the clip a second covers", () => {
			const playing = voice({ pitch: 2 }).play();

			context.advance(0.5);
			expect(playing.position()).toBe(1);

			playing.setPitch(1);
			context.advance(0.5);
			expect(playing.position()).toBe(1.5);
			expect(context.lastSource().playbackRate.value).toBe(1);
		});
	});

	suite("Volume", () => {
		test("Setting the volume ramps the gain rather than stepping it", () => {
			const playing = voice().play();
			const gain = gainAfter(context.lastSource()).gain;

			playing.setVolume(20);

			expect(playing.getVolume()).toBe(20);
			expect(gain.target).toBe(0.2);
			expect(gain.events.some((event) => event.type === "ramp")).toBe(true);
			expect(gain.value).toBe(1);

			context.advance(0.1);
			expect(gain.value).toBeCloseTo(0.2);
		});

		test("A fade reaches its target over the seconds asked for", () => {
			const playing = voice({ volume: 0, loop: true }).play();
			const gain = gainAfter(context.lastSource()).gain;

			playing.fade(100, 2);

			context.advance(1);
			expect(gain.value).toBeCloseTo(0.5);

			context.advance(1);
			expect(gain.value).toBe(1);
			expect(playing.getVolume()).toBe(100);
		});

		test("A fade that interrupts a fade continues from where the first had got to", () => {
			const playing = voice({ volume: 0, loop: true }).play();
			const gain = gainAfter(context.lastSource()).gain;

			playing.fade(100, 2);
			context.advance(1);
			playing.fade(0, 1);

			expect(gain.value).toBeCloseTo(0.5);
			context.advance(0.5);
			expect(gain.value).toBeCloseTo(0.25);
		});

		test("Volume is clamped to a percentage", () => {
			const playing = voice().play();

			playing.setVolume(300);
			expect(playing.getVolume()).toBe(100);

			playing.setVolume(-5);
			expect(playing.getVolume()).toBe(0);
		});
	});

	suite("Before the first gesture", () => {
		test("A one-shot started on a context that is not running is dropped, not queued", () => {
			context = new FakeAudioContext("suspended");
			output = new FakeAudioNode(context);

			let told = 0;
			const blip = voice();
			blip.onStopped = () => told++;
			blip.play();

			expect(blip.getState()).toBe("stopped");
			expect(context.sources).toHaveLength(0);
			expect(told).toBe(1);
		});

		test("A loop started on a context that is not running is let through, to begin on the gesture", () => {
			context = new FakeAudioContext("suspended");
			output = new FakeAudioNode(context);

			const theme = voice({ loop: true }).play();

			expect(theme.isPlaying()).toBe(true);
			expect(context.sources).toHaveLength(1);
		});
	});
});
