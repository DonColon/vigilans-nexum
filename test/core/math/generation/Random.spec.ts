import { test, expect, suite } from "vitest";
import { Random } from "@/core/math/generation/Random";
import { getRandomState, randomInteger, seedRandom, setRandomState } from "@/core/math/generation/Randomizer";

suite("Random Test Suite", () => {
	test("Same seed produces the same sequence", () => {
		const value = new Random(1234);
		const other = new Random(1234);

		const first = Array.from({ length: 20 }, () => value.next());
		const second = Array.from({ length: 20 }, () => other.next());

		expect(first).toEqual(second);
	});

	test("Different seeds produce different sequences", () => {
		const value = new Random(1234);
		const other = new Random(4321);

		const first = Array.from({ length: 20 }, () => value.next());
		const second = Array.from({ length: 20 }, () => other.next());

		expect(first).not.toEqual(second);
	});

	test("Values stay within the unit interval", () => {
		const generator = new Random(99);

		for (let i = 0; i < 1000; i++) {
			const value = generator.next();

			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	test("Restoring the state resumes the same sequence", () => {
		const generator = new Random(7);

		generator.next();
		generator.next();

		const state = generator.getState();
		const expected = Array.from({ length: 10 }, () => generator.next());

		generator.setState(state);
		const actual = Array.from({ length: 10 }, () => generator.next());

		expect(actual).toEqual(expected);
	});

	test("Seeding restarts the sequence", () => {
		const generator = new Random(7);

		const first = Array.from({ length: 5 }, () => generator.next());

		generator.seed(7);
		const second = Array.from({ length: 5 }, () => generator.next());

		expect(second).toEqual(first);
	});

	test("Forked generators do not consume the parent sequence", () => {
		const generator = new Random(42);
		const fork = generator.fork();

		const forkValues = Array.from({ length: 5 }, () => fork.next());
		const parentValues = Array.from({ length: 5 }, () => generator.next());

		expect(forkValues).not.toEqual(parentValues);
	});

	test("Gameplay generator state round-trips through the module API", () => {
		seedRandom(2024);

		randomInteger({ min: 0, max: 100 });
		const state = getRandomState();

		const expected = Array.from({ length: 10 }, () => randomInteger({ min: 0, max: 100 }));

		setRandomState(state);
		const actual = Array.from({ length: 10 }, () => randomInteger({ min: 0, max: 100 }));

		expect(actual).toEqual(expected);
	});
});
