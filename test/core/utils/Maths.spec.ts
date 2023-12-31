import { test, expect } from "vitest";
import { isDivisibleBy, isEven, isFibonacci, isOdd, isPerfectSquare, isPowerOf, isPrime } from "../../../src/core/utils/Maths";

test("Number is divisible by x", () => {
	let result = isDivisibleBy(10, 5);
	expect(result).toBeTruthy();

	result = isDivisibleBy(10, 3);
	expect(result).toBeFalsy();
});

test("Number is even", () => {
	let result = isEven(10);
	expect(result).toBeTruthy();

	result = isEven(9);
	expect(result).toBeFalsy();
});

test("Number is even", () => {
	let result = isOdd(9);
	expect(result).toBeTruthy();

	result = isOdd(10);
	expect(result).toBeFalsy();
});

test("Number is power of x", () => {
	let result = isPowerOf(64, 2);
	expect(result).toBeTruthy();

	result = isPowerOf(0, 2);
	expect(result).toBeFalsy();

	result = isPowerOf(63, 2);
	expect(result).toBeFalsy();
});

test("Number is prime", () => {
	let result = isPrime(37);
	expect(result).toBeTruthy();

	result = isPrime(1);
	expect(result).toBeFalsy();

	result = isPrime(4);
	expect(result).toBeFalsy();
});

test("Number is perfect square", () => {
	let result = isPerfectSquare(64);
	expect(result).toBeTruthy();

	result = isPerfectSquare(63);
	expect(result).toBeFalsy();
});

test("Number is fibonacci", () => {
	let result = isFibonacci(21);
	expect(result).toBeTruthy();

	result = isFibonacci(15);
	expect(result).toBeFalsy();
});
