/**
 * Deterministic pseudo random number generator (mulberry32).
 *
 * A tactical RPG needs its dice to be reproducible: a savegame that stores the
 * generator state replays the same hit rolls after a reload, which is what makes
 * save-scumming behave consistently and what makes a bug report reproducible.
 * Math.random cannot do that because its state is neither readable nor settable.
 *
 * The state is a single 32 bit integer, so it serialises into a savegame as one
 * number. Sequences are identical across browsers and across builds.
 */
export class Random {
	private state: number;

	constructor(seed: number = Date.now()) {
		this.state = seed >>> 0;
	}

	/**
	 * Next value in [0, 1), advancing the generator.
	 */
	public next(): number {
		this.state = (this.state + 0x6d2b79f5) >>> 0;

		let value = this.state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	}

	/**
	 * Current generator state. Store this in a savegame to resume the exact
	 * same sequence later.
	 */
	public getState(): number {
		return this.state;
	}

	public setState(state: number): void {
		this.state = state >>> 0;
	}

	/**
	 * Restarts the sequence from the given seed.
	 */
	public seed(seed: number): void {
		this.setState(seed);
	}

	/**
	 * Independent generator derived from this one. Useful to keep unrelated
	 * subsystems from consuming each other's draws.
	 */
	public fork(): Random {
		return new Random(Math.floor(this.next() * 4294967296));
	}
}
