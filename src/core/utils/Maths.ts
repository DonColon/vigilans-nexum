export namespace Maths {
	export function toDegrees(radians: number): number {
		return ((radians * 180) / Math.PI + 360) % 360;
	}

	export function toRadians(degrees: number): number {
		return (degrees * Math.PI) / 180;
	}

	export function isDivisibleBy(value: number, divisor: number): boolean {
		return value % divisor === 0;
	}

	export function isEven(value: number): boolean {
		return isDivisibleBy(value, 2);
	}

	export function isOdd(value: number): boolean {
		return !isDivisibleBy(value, 2);
	}

	export function isPowerOf(value: number, base: number): boolean {
		if (value === 0) return false;

		const exponent = Math.log(value) / Math.log(base);
		return Math.ceil(exponent) === Math.floor(exponent);
	}

	export function isPrime(value: number): boolean {
		if (value <= 1) return false;

		for (let i = 2; i < value; i++) {
			if (isDivisibleBy(value, i)) {
				return false;
			}
		}

		return true;
	}

	export function isPerfectSquare(value: number): boolean {
		const side = Math.sqrt(value);
		return side * side === value;
	}

	export function isFibonacci(value: number): boolean {
		return isPerfectSquare(5 * value * value + 4) || isPerfectSquare(5 * value * value - 4);
	}
}
