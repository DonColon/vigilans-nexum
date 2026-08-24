import { Random } from "@/core/math/generation/Random";
import { Tuple } from "@/core/utils/Arrays";

interface Range {
	min?: number;
	max?: number;
}

/**
 * Generator behind every gameplay draw. Its state is part of the savegame, so
 * a reloaded game continues the exact same sequence.
 */
const generator = new Random();

export function getGenerator(): Random {
	return generator;
}

export function seedRandom(seed: number): void {
	generator.seed(seed);
}

export function getRandomState(): number {
	return generator.getState();
}

export function setRandomState(state: number): void {
	generator.setState(state);
}

export function randomInteger(range: Range): number {
	const min = range.min ?? 0;
	const max = range.max ?? Number.MAX_SAFE_INTEGER;

	return Math.floor(generator.next() * (max - min + 1)) + min;
}

export function randomIntegers<L extends number>(length: L, range: Range): Tuple<number, L> {
	const values = [];

	for (let i = 0; i < length; i++) {
		const value = randomInteger(range);
		values.push(value);
	}

	return values as Tuple<number, L>;
}

export function randomDecimal(range: Range): number {
	const min = range.min ?? 0;
	const max = range.max ?? Number.MAX_VALUE;

	const value = generator.next() * (max - min + 1) + min;

	if (value > max) return max;

	return value;
}

export function randomDecimals<L extends number>(length: L, range: Range): Tuple<number, L> {
	const values = [];

	for (let i = 0; i < length; i++) {
		const value = randomDecimal(range);
		values.push(value);
	}

	return values as Tuple<number, L>;
}

export function randomBoolean(): boolean {
	return Math.round(generator.next()) === 1;
}

export function randomBooleans<L extends number>(length: L): Tuple<boolean, L> {
	const values = [];

	for (let i = 0; i < length; i++) {
		const value = randomBoolean();
		values.push(value);
	}

	return values as Tuple<boolean, L>;
}

/**
 * Identifiers are deliberately kept off the gameplay generator: creating an
 * entity must not consume draws, otherwise it would shift every later dice roll
 * and break replay determinism.
 */
export function randomUUID(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	let current = Date.now();

	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
		const random = Math.floor(Math.random() * 17);

		const hexCode = (current + random) % 16;
		current = Math.floor(current / 16);

		if (current === 0) current = Date.now();

		return (value === "x" ? hexCode : (hexCode % 4) + 8).toString(16);
	});
}

export function anyOf<T>(items: T[]): T | undefined {
	const index = randomInteger({ max: items.length - 1 });
	return items.at(index);
}
