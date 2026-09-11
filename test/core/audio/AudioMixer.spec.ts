import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { AudioMixer } from "@/core/audio/AudioMixer";
import { GameError } from "@/core/GameError";
import { FakeAudioContext, FakeAudioNode, FakeAudioParam, FakeGainNode, fakeClip } from "./FakeAudioContext";

/**
 * The Web Audio owner: one context, a master gain, the channels hanging off
 * it, and the two things a browser makes an audio system deal with - the
 * gesture that first lets a context run, and the tab going into the
 * background.
 */
suite("Audio Mixer Test Suite", () => {
	let context: FakeAudioContext;
	let mixer: AudioMixer;

	const setHidden = (hidden: boolean) => {
		Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
		document.dispatchEvent(new Event("visibilitychange"));
	};

	/** The gain the destination is fed by - the master - found by following a probe voice downstream. */
	const master = (): FakeAudioParam => {
		mixer.addChannel("probe").play(fakeClip("probe"), { loop: true });

		let node: FakeAudioNode = context.lastSource();

		while (!node.isConnectedTo(context.destination)) {
			node = node.outputs.values().next().value as FakeAudioNode;
		}

		return (node as FakeGainNode).gain;
	};

	beforeEach(() => {
		context = new FakeAudioContext("suspended");
		mixer = new AudioMixer(context.asContext());
	});

	afterEach(() => {
		mixer.dispose();
		Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
	});

	suite("Unlocking", () => {
		test("The context starts locked and a gesture of any kind resumes it", async () => {
			expect(mixer.isUnlocked()).toBe(false);
			expect(mixer.isRunning()).toBe(false);

			document.dispatchEvent(new Event("keydown"));
			await Promise.resolve();

			expect(mixer.isUnlocked()).toBe(true);
			expect(mixer.isRunning()).toBe(true);
			expect(context.resumes).toBe(1);
		});

		test("Once unlocked the gesture listeners are gone - a later gesture resumes nothing", async () => {
			document.dispatchEvent(new Event("click"));
			await Promise.resolve();
			document.dispatchEvent(new Event("click"));
			document.dispatchEvent(new Event("touchstart"));
			await Promise.resolve();

			expect(context.resumes).toBe(1);
		});
	});

	suite("Tab visibility", () => {
		test("A hidden tab suspends the context and coming back resumes it", async () => {
			document.dispatchEvent(new Event("keydown"));
			await Promise.resolve();

			setHidden(true);
			expect(context.state).toBe("suspended");

			setHidden(false);
			expect(context.state).toBe("running");
		});

		test("Coming back to a tab that was never unlocked leaves the resuming to the gesture", () => {
			setHidden(true);
			setHidden(false);

			expect(context.state).toBe("suspended");
			expect(context.resumes).toBe(0);
		});

		test("Suspending on hide can be switched off", async () => {
			mixer.dispose();
			context = new FakeAudioContext("suspended");
			mixer = new AudioMixer(context.asContext(), false);

			document.dispatchEvent(new Event("keydown"));
			await Promise.resolve();
			setHidden(true);

			expect(context.state).toBe("running");
		});
	});

	suite("Channels", () => {
		test("A channel is added by name, feeds the master, and cannot be added twice", () => {
			const channel = mixer.addChannel("sound");

			expect(channel.getName()).toBe("sound");
			expect(mixer.hasChannel("sound")).toBe(true);
			expect(mixer.getChannel("sound")).toBe(channel);
			expect(mixer.getChannelNames()).toEqual(["sound"]);
			expect(() => mixer.addChannel("sound")).toThrow(GameError);
		});

		test("A channel that does not exist is an error, not a silent miss", () => {
			expect(() => mixer.getChannel("music")).toThrow(GameError);
		});

		test("Removing a channel stops what is on it; removing a stranger is nothing", () => {
			context.state = "running";
			const channel = mixer.addChannel("sound");
			const voice = channel.play(fakeClip("sound"), { loop: true });

			mixer.removeChannel("sound");
			mixer.removeChannel("nothing");

			expect(voice.getState()).toBe("stopped");
			expect(mixer.hasChannel("sound")).toBe(false);
		});

		test("What a channel plays reaches the speakers", () => {
			context.state = "running";
			mixer.addChannel("sound").play(fakeClip("sound"), { loop: true });

			expect(context.lastSource().reaches(context.destination)).toBe(true);
		});
	});

	suite("Master", () => {
		test("The master volume is ramped, clamped and read back as what was set", () => {
			context.state = "running";
			const gain = master();

			mixer.setMasterVolume(70);
			context.advance(0.1);

			expect(mixer.getMasterVolume()).toBe(70);
			expect(gain.value).toBeCloseTo(0.7);

			mixer.setMasterVolume(140);
			expect(mixer.getMasterVolume()).toBe(100);
		});

		test("Muting the master silences everything and keeps the level for the unmute", () => {
			context.state = "running";
			const gain = master();
			mixer.setMasterVolume(55);

			mixer.muteMaster();
			context.advance(0.1);
			expect(mixer.isMasterMuted()).toBe(true);
			expect(mixer.getMasterVolume()).toBe(55);
			expect(gain.value).toBe(0);

			mixer.unmuteMaster();
			context.advance(0.1);
			expect(gain.value).toBeCloseTo(0.55);
		});
	});

	test("Decoding goes through the mixer's own context", async () => {
		const data = new ArrayBuffer(8);
		const buffer = await mixer.decode(data);

		expect(context.decoded).toEqual([data]);
		expect(buffer.duration).toBe(1);
	});

	test("Disposing drops the channels, closes the context and stops listening to the page", async () => {
		mixer.addChannel("sound");

		await mixer.dispose();
		document.dispatchEvent(new Event("keydown"));

		expect(context.closes).toBe(1);
		expect(context.resumes).toBe(0);
		expect(mixer.getChannelNames()).toEqual([]);
	});
});
