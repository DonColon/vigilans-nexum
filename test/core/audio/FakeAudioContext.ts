import { AudioClip } from "@/core/audio/AudioClip";

/**
 * Just enough of the Web Audio API for the audio system to run under jsdom,
 * which has none of it. Nothing here makes a sound: nodes remember what they
 * are connected to, params remember what was scheduled on them and can say
 * what they are worth at any time, and a buffer source ends when the clock is
 * advanced past its end - which is how a test hears a one-shot finish.
 *
 * The clock never moves on its own. A test calls `advance(seconds)` and the
 * context steps `currentTime`, fires `ended` on every source that ran out on
 * the way and lets the automation curves catch up.
 */

type ParamEvent = { type: "set" | "ramp"; value: number; time: number };

export class FakeAudioParam implements AudioParam {
	public readonly events: ParamEvent[] = [];
	public readonly automationRate: AutomationRate = "a-rate";
	public readonly defaultValue: number;
	public readonly maxValue = 3.4e38;
	public readonly minValue = -3.4e38;

	private base: number;

	constructor(
		private readonly clock: () => number,
		initial: number
	) {
		this.base = initial;
		this.defaultValue = initial;
	}

	/** What the param is worth right now, ramps included. */
	public get value(): number {
		return this.valueAt(this.clock());
	}

	/** Assigning `value` is `setValueAtTime(value, now)` - which is what makes doing it mid-ramp a bug. */
	public set value(value: number) {
		this.setValueAtTime(value, this.clock());
	}

	public valueAt(time: number): number {
		let previous: ParamEvent | null = null;
		let value = this.base;

		for (const event of this.events) {
			if (event.time > time) {
				if (event.type === "ramp") {
					const from = previous ? previous.value : this.base;
					const start = previous ? previous.time : 0;
					const progress = event.time === start ? 1 : (time - start) / (event.time - start);
					return from + (event.value - from) * Math.min(Math.max(progress, 0), 1);
				}

				return value;
			}

			value = event.value;
			previous = event;
		}

		return value;
	}

	/** The value the last scheduled event lands on - where a ramp is heading. */
	public get target(): number {
		return this.events.length ? this.events[this.events.length - 1].value : this.base;
	}

	public setValueAtTime(value: number, time: number): AudioParam {
		this.events.push({ type: "set", value, time });
		this.events.sort((a, b) => a.time - b.time);
		return this;
	}

	public linearRampToValueAtTime(value: number, time: number): AudioParam {
		this.events.push({ type: "ramp", value, time });
		this.events.sort((a, b) => a.time - b.time);
		return this;
	}

	public cancelScheduledValues(time: number): AudioParam {
		const kept = this.events.filter((event) => event.time < time);
		this.events.length = 0;
		this.events.push(...kept);
		return this;
	}

	public exponentialRampToValueAtTime(value: number, time: number): AudioParam {
		return this.linearRampToValueAtTime(value, time);
	}

	public setTargetAtTime(value: number, time: number): AudioParam {
		return this.setValueAtTime(value, time);
	}

	public setValueCurveAtTime(): AudioParam {
		return this;
	}

	public cancelAndHoldAtTime(time: number): AudioParam {
		return this.cancelScheduledValues(time);
	}
}

export class FakeAudioNode extends EventTarget {
	public readonly outputs = new Set<FakeAudioNode>();
	public readonly channelCount = 2;
	public readonly channelCountMode: ChannelCountMode = "max";
	public readonly channelInterpretation: ChannelInterpretation = "speakers";
	public readonly numberOfInputs = 1;
	public readonly numberOfOutputs = 1;

	constructor(public readonly context: FakeAudioContext) {
		super();
	}

	public connect(destination: AudioNode | AudioParam): AudioNode {
		this.outputs.add(destination as unknown as FakeAudioNode);
		return destination as AudioNode;
	}

	public disconnect(): void {
		this.outputs.clear();
	}

	public isConnectedTo(node: FakeAudioNode): boolean {
		return this.outputs.has(node);
	}

	/** Whether this node's signal reaches `target` through any number of hops. */
	public reaches(target: FakeAudioNode): boolean {
		if (this.outputs.has(target)) {
			return true;
		}

		return [...this.outputs].some((next) => next.reaches(target));
	}
}

export class FakeGainNode extends FakeAudioNode {
	public readonly gain: FakeAudioParam;

	constructor(context: FakeAudioContext) {
		super(context);
		this.gain = new FakeAudioParam(() => context.currentTime, 1);
	}
}

export class FakeStereoPannerNode extends FakeAudioNode {
	public readonly pan: FakeAudioParam;

	constructor(context: FakeAudioContext) {
		super(context);
		this.pan = new FakeAudioParam(() => context.currentTime, 0);
	}
}

export class FakeBufferSourceNode extends FakeAudioNode {
	public buffer: AudioBuffer | null = null;
	public loop = false;
	public loopStart = 0;
	public loopEnd = 0;
	public readonly playbackRate: FakeAudioParam;
	public readonly detune: FakeAudioParam;
	public onended: ((this: AudioScheduledSourceNode, ev: Event) => any) | null = null;

	/** When and from where `start` was called - null until it is. */
	public started: { when: number; offset: number } | null = null;
	/** Context time `stop` asked for - null until it is called. */
	public stopAt: number | null = null;
	public ended = false;

	constructor(context: FakeAudioContext) {
		super(context);
		this.playbackRate = new FakeAudioParam(() => context.currentTime, 1);
		this.detune = new FakeAudioParam(() => context.currentTime, 0);
	}

	public start(when: number = 0, offset: number = 0): void {
		if (this.started) {
			throw new DOMException("cannot call start more than once", "InvalidStateError");
		}

		this.started = { when: Math.max(when, this.context.currentTime), offset };
	}

	public stop(when: number = 0): void {
		if (!this.started) {
			throw new DOMException("cannot call stop without calling start first", "InvalidStateError");
		}

		this.stopAt = Math.max(when, this.context.currentTime);
	}

	/** Context time a one-shot runs out on its own; never, for a loop. */
	public naturalEnd(): number | null {
		if (!this.started || !this.buffer || this.loop) {
			return null;
		}

		const rate = this.playbackRate.value || 1;
		return this.started.when + (this.buffer.duration - this.started.offset) / rate;
	}

	/** Called by the context as the clock moves: fires `ended` once the source is over. */
	public tick(now: number): void {
		if (this.ended || !this.started) {
			return;
		}

		const natural = this.naturalEnd();
		const end = Math.min(this.stopAt ?? Number.POSITIVE_INFINITY, natural ?? Number.POSITIVE_INFINITY);

		if (end <= now) {
			this.ended = true;
			this.onended?.call(this as unknown as AudioScheduledSourceNode, new Event("ended"));
		}
	}
}

export class FakeAudioContext {
	public currentTime = 0;
	public state: AudioContextState;
	public readonly destination: FakeAudioNode;
	public readonly sources: FakeBufferSourceNode[] = [];
	public readonly decoded: ArrayBuffer[] = [];
	public readonly sampleRate = 44100;

	public resumes = 0;
	public suspends = 0;
	public closes = 0;

	constructor(state: AudioContextState = "running") {
		this.state = state;
		this.destination = new FakeAudioNode(this);
	}

	/** Moves the clock and lets every source that ran out on the way end. */
	public advance(seconds: number): void {
		this.currentTime += seconds;

		for (const source of [...this.sources]) {
			source.tick(this.currentTime);
		}
	}

	public createGain(): GainNode {
		return new FakeGainNode(this) as unknown as GainNode;
	}

	public createStereoPanner(): StereoPannerNode {
		return new FakeStereoPannerNode(this) as unknown as StereoPannerNode;
	}

	public createBufferSource(): AudioBufferSourceNode {
		const source = new FakeBufferSourceNode(this);
		this.sources.push(source);
		return source as unknown as AudioBufferSourceNode;
	}

	public decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> {
		this.decoded.push(data);
		return Promise.resolve(fakeBuffer(1));
	}

	public resume(): Promise<void> {
		this.resumes++;

		if (this.state === "suspended") {
			this.state = "running";
		}

		return Promise.resolve();
	}

	public suspend(): Promise<void> {
		this.suspends++;

		if (this.state === "running") {
			this.state = "suspended";
		}

		return Promise.resolve();
	}

	public close(): Promise<void> {
		this.closes++;
		this.state = "closed";
		return Promise.resolve();
	}

	/** The sources that have been started and not ended yet. */
	public liveSources(): FakeBufferSourceNode[] {
		return this.sources.filter((source) => source.started && !source.ended && (source.stopAt === null || source.stopAt > this.currentTime));
	}

	/** The latest source handed out. */
	public lastSource(): FakeBufferSourceNode {
		const source = this.sources[this.sources.length - 1];

		if (!source) {
			throw new Error("No buffer source has been created");
		}

		return source;
	}

	public asContext(): AudioContext {
		return this as unknown as AudioContext;
	}
}

/** A "decoded" buffer of the given length. Only the duration is ever read. */
export function fakeBuffer(duration: number): AudioBuffer {
	return {
		duration,
		length: Math.round(duration * 44100),
		numberOfChannels: 2,
		sampleRate: 44100
	} as AudioBuffer;
}

export function fakeClip(channel: string, duration: number = 1): AudioClip {
	return { buffer: fakeBuffer(duration), channel };
}

/** The gain node a source plays into - a voice's own volume. */
export function gainAfter(node: FakeAudioNode): FakeGainNode {
	const next = [...node.outputs].find((output) => output instanceof FakeGainNode);

	if (!next) {
		throw new Error("Node does not feed a gain node");
	}

	return next;
}

/** The panner a voice's gain plays into. */
export function pannerAfter(node: FakeAudioNode): FakeStereoPannerNode {
	const next = [...node.outputs].find((output) => output instanceof FakeStereoPannerNode);

	if (!next) {
		throw new Error("Node does not feed a panner");
	}

	return next;
}
