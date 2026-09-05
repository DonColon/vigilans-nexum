import { describe, test, expect } from "vitest";
import {
	GOLDEN_RATIO,
	EULER,
	fibonacci,
	fibonacciNth,
	primes,
	firstNPrimes,
	triangular,
	squares,
	cubes,
	pentagonal,
	hexagonal,
	catalan,
	factorials,
	powersOfTwo,
	lucas,
	pell,
	isPrime,
	isFibonacci,
	isPerfectSquare,
	isPerfectCube,
	isTriangular,
	isPentagonal,
	isHexagonal,
	isPowerOfTwo,
	isPowerOf,
	isEven,
	isOdd,
	factorial,
	gcd,
	lcm,
	isPerfectNumber,
	isAbundant
} from "@/core/math/generation/Numbers";

describe("Numbers Module Test Suite", () => {
	// Constants
	test("Mathematical constants are correct", () => {
		expect(GOLDEN_RATIO).toBeCloseTo(1.618, 3);
		expect(EULER).toBeCloseTo(2.718, 3);
	});

	// Fibonacci
	test("Generates Fibonacci sequence", () => {
		const fib = fibonacci(7);
		expect(fib).toEqual([0, 1, 1, 2, 3, 5, 8]);
	});

	test("Gets nth Fibonacci number", () => {
		expect(fibonacciNth(0)).toBe(0);
		expect(fibonacciNth(1)).toBe(1);
		expect(fibonacciNth(6)).toBe(8);
		expect(fibonacciNth(10)).toBe(55);
	});

	test("Checks if number is Fibonacci", () => {
		expect(isFibonacci(0)).toBe(true);
		expect(isFibonacci(1)).toBe(true);
		expect(isFibonacci(8)).toBe(true);
		expect(isFibonacci(55)).toBe(true);
		expect(isFibonacci(10)).toBe(false);
	});

	// Primes
	test("Generates prime numbers up to n", () => {
		const primesTo20 = primes(20);
		expect(primesTo20).toEqual([2, 3, 5, 7, 11, 13, 17, 19]);
	});

	test("Generates first n prime numbers", () => {
		const first5 = firstNPrimes(5);
		expect(first5).toEqual([2, 3, 5, 7, 11]);
	});

	test("Checks if number is prime", () => {
		expect(isPrime(2)).toBe(true);
		expect(isPrime(7)).toBe(true);
		expect(isPrime(17)).toBe(true);
		expect(isPrime(1)).toBe(false);
		expect(isPrime(4)).toBe(false);
		expect(isPrime(10)).toBe(false);
	});

	// Triangular numbers
	test("Generates triangular numbers", () => {
		const tri = triangular(5);
		expect(tri).toEqual([1, 3, 6, 10, 15]);
	});

	test("Checks if number is triangular", () => {
		expect(isTriangular(1)).toBe(true);
		expect(isTriangular(6)).toBe(true);
		expect(isTriangular(10)).toBe(true);
		expect(isTriangular(5)).toBe(false);
	});

	// Square numbers
	test("Generates square numbers", () => {
		const sq = squares(5);
		expect(sq).toEqual([1, 4, 9, 16, 25]);
	});

	test("Checks if number is perfect square", () => {
		expect(isPerfectSquare(1)).toBe(true);
		expect(isPerfectSquare(4)).toBe(true);
		expect(isPerfectSquare(25)).toBe(true);
		expect(isPerfectSquare(10)).toBe(false);
	});

	// Cube numbers
	test("Generates cube numbers", () => {
		const cb = cubes(4);
		expect(cb).toEqual([1, 8, 27, 64]);
	});

	test("Checks if number is perfect cube", () => {
		expect(isPerfectCube(1)).toBe(true);
		expect(isPerfectCube(8)).toBe(true);
		expect(isPerfectCube(27)).toBe(true);
		expect(isPerfectCube(10)).toBe(false);
	});

	// Pentagonal numbers
	test("Generates pentagonal numbers", () => {
		const pent = pentagonal(5);
		expect(pent).toEqual([1, 5, 12, 22, 35]);
	});

	test("Checks if number is pentagonal", () => {
		expect(isPentagonal(1)).toBe(true);
		expect(isPentagonal(5)).toBe(true);
		expect(isPentagonal(12)).toBe(true);
		expect(isPentagonal(10)).toBe(false);
	});

	// Hexagonal numbers
	test("Generates hexagonal numbers", () => {
		const hex = hexagonal(5);
		expect(hex).toEqual([1, 6, 15, 28, 45]);
	});

	test("Checks if number is hexagonal", () => {
		expect(isHexagonal(1)).toBe(true);
		expect(isHexagonal(6)).toBe(true);
		expect(isHexagonal(15)).toBe(true);
		expect(isHexagonal(10)).toBe(false);
	});

	// Catalan numbers
	test("Generates Catalan numbers", () => {
		const cat = catalan(6);
		expect(cat).toEqual([1, 1, 2, 5, 14, 42]);
	});

	// Factorials
	test("Generates factorial sequence", () => {
		const facts = factorials(5);
		expect(facts).toEqual([1, 2, 6, 24, 120]);
	});

	test("Calculates factorial of number", () => {
		expect(factorial(0)).toBe(1);
		expect(factorial(1)).toBe(1);
		expect(factorial(5)).toBe(120);
		expect(factorial(6)).toBe(720);
	});

	// Powers of 2
	test("Generates powers of 2", () => {
		const pow2 = powersOfTwo(6);
		expect(pow2).toEqual([1, 2, 4, 8, 16, 32]);
	});

	test("Checks if number is power of 2", () => {
		expect(isPowerOfTwo(1)).toBe(true);
		expect(isPowerOfTwo(2)).toBe(true);
		expect(isPowerOfTwo(16)).toBe(true);
		expect(isPowerOfTwo(3)).toBe(false);
		expect(isPowerOfTwo(10)).toBe(false);
	});

	test("Checks if number is power of base", () => {
		expect(isPowerOf(8, 2)).toBe(true);
		expect(isPowerOf(27, 3)).toBe(true);
		expect(isPowerOf(10, 5)).toBe(false);
	});

	// Lucas numbers
	test("Generates Lucas numbers", () => {
		const luc = lucas(6);
		expect(luc).toEqual([2, 1, 3, 4, 7, 11]);
	});

	// Pell numbers
	test("Generates Pell numbers", () => {
		const pellSeq = pell(6);
		expect(pellSeq).toEqual([0, 1, 2, 5, 12, 29]);
	});

	// Even/Odd
	test("Checks if number is even", () => {
		expect(isEven(2)).toBe(true);
		expect(isEven(10)).toBe(true);
		expect(isEven(3)).toBe(false);
	});

	test("Checks if number is odd", () => {
		expect(isOdd(1)).toBe(true);
		expect(isOdd(7)).toBe(true);
		expect(isOdd(4)).toBe(false);
	});

	// GCD and LCM
	test("Calculates greatest common divisor", () => {
		expect(gcd(12, 8)).toBe(4);
		expect(gcd(21, 14)).toBe(7);
		expect(gcd(17, 19)).toBe(1);
	});

	test("Calculates least common multiple", () => {
		expect(lcm(4, 6)).toBe(12);
		expect(lcm(3, 5)).toBe(15);
		expect(lcm(12, 18)).toBe(36);
	});

	// Perfect numbers use internal divisor calculation
	test("Checks if number is perfect", () => {
		expect(isPerfectNumber(6)).toBe(true); // 1+2+3 = 6
		expect(isPerfectNumber(28)).toBe(true); // 1+2+4+7+14 = 28
		expect(isPerfectNumber(12)).toBe(false);
	});

	test("Checks if number is abundant", () => {
		expect(isAbundant(12)).toBe(true); // 1+2+3+4+6 = 16 > 12
		expect(isAbundant(6)).toBe(false);
	});
});
