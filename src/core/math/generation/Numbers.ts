/**
 * Numbers module - Famous number sequences and checking utilities.
 * 
 * Contains:
 * - Famous mathematical constants
 * - Number sequence generators (Fibonacci, Prime, etc.)
 * - Number property checkers
 * - Number sequence validators
 */

// ============================================================================
// MATHEMATICAL CONSTANTS
// ============================================================================

export const GOLDEN_RATIO = 1.618033988749895; // φ (Phi)
export const EULER = 2.718281828459045;        // e
export const SQRT_2 = 1.4142135623730951;
export const SQRT_3 = 1.7320508075688772;
export const SQRT_5 = 2.23606797749979;
export const LN_2 = 0.6931471805599453;
export const LN_10 = 2.302585092994046;
export const LOG2_E = 1.4426950408889634;
export const LOG10_E = 0.4342944819032518;

// ============================================================================
// FAMOUS NUMBER SEQUENCES
// ============================================================================

/**
 * Generates Fibonacci sequence up to n terms
 * Sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...
 */
export function fibonacci(n: number): number[] {
    if (n <= 0) return [];
    if (n === 1) return [0];
    
    const sequence = [0, 1];
    
    for (let i = 2; i < n; i++) {
        sequence.push(sequence[i - 1] + sequence[i - 2]);
    }
    
    return sequence;
}

/**
 * Gets the nth Fibonacci number (optimized)
 */
export function fibonacciNth(n: number): number {
    if (n === 0) return 0;
    if (n === 1) return 1;
    
    let a = 0;
    let b = 1;
    
    for (let i = 2; i <= n; i++) {
        const temp = a + b;
        a = b;
        b = temp;
    }
    
    return b;
}

/**
 * Generates prime numbers up to n
 * Uses Sieve of Eratosthenes
 */
export function primes(n: number): number[] {
    if (n < 2) return [];
    
    const isPrime = new Array(n + 1).fill(true);
    isPrime[0] = isPrime[1] = false;
    
    for (let i = 2; i * i <= n; i++) {
        if (isPrime[i]) {
            for (let j = i * i; j <= n; j += i) {
                isPrime[j] = false;
            }
        }
    }
    
    return isPrime.map((prime, index) => prime ? index : -1).filter(x => x !== -1);
}

/**
 * Generates first n prime numbers
 */
export function firstNPrimes(n: number): number[] {
    if (n <= 0) return [];
    
    const result: number[] = [];
    let candidate = 2;
    
    while (result.length < n) {
        if (isPrime(candidate)) {
            result.push(candidate);
        }
        candidate++;
    }
    
    return result;
}

/**
 * Generates triangular numbers (1, 3, 6, 10, 15, 21, ...)
 * Formula: n * (n + 1) / 2
 */
export function triangular(n: number): number[] {
    const sequence: number[] = [];
    
    for (let i = 1; i <= n; i++) {
        sequence.push((i * (i + 1)) / 2);
    }
    
    return sequence;
}

/**
 * Generates square numbers (1, 4, 9, 16, 25, ...)
 */
export function squares(n: number): number[] {
    const sequence: number[] = [];
    
    for (let i = 1; i <= n; i++) {
        sequence.push(i * i);
    }
    
    return sequence;
}

/**
 * Generates cubic numbers (1, 8, 27, 64, 125, ...)
 */
export function cubes(n: number): number[] {
    const sequence: number[] = [];
    
    for (let i = 1; i <= n; i++) {
        sequence.push(i * i * i);
    }
    
    return sequence;
}

/**
 * Generates pentagonal numbers (1, 5, 12, 22, 35, ...)
 * Formula: n * (3n - 1) / 2
 */
export function pentagonal(n: number): number[] {
    const sequence: number[] = [];
    
    for (let i = 1; i <= n; i++) {
        sequence.push((i * (3 * i - 1)) / 2);
    }
    
    return sequence;
}

/**
 * Generates hexagonal numbers (1, 6, 15, 28, 45, ...)
 * Formula: n * (2n - 1)
 */
export function hexagonal(n: number): number[] {
    const sequence: number[] = [];
    
    for (let i = 1; i <= n; i++) {
        sequence.push(i * (2 * i - 1));
    }
    
    return sequence;
}

/**
 * Generates Catalan numbers (1, 1, 2, 5, 14, 42, ...)
 * Formula: C(n) = (2n)! / ((n+1)! * n!)
 */
export function catalan(n: number): number[] {
    const sequence: number[] = [1];
    
    for (let i = 1; i < n; i++) {
        let catalan = 0;
        for (let j = 0; j < i; j++) {
            catalan += sequence[j] * sequence[i - 1 - j];
        }
        sequence.push(catalan);
    }
    
    return sequence;
}

/**
 * Generates factorial sequence (1, 2, 6, 24, 120, ...)
 */
export function factorials(n: number): number[] {
    const sequence: number[] = [1];
    
    for (let i = 1; i < n; i++) {
        sequence.push(sequence[i - 1] * (i + 1));
    }
    
    return sequence;
}

/**
 * Generates powers of 2 (1, 2, 4, 8, 16, 32, ...)
 */
export function powersOfTwo(n: number): number[] {
    const sequence: number[] = [];
    
    for (let i = 0; i < n; i++) {
        sequence.push(Math.pow(2, i));
    }
    
    return sequence;
}

/**
 * Generates Lucas numbers (2, 1, 3, 4, 7, 11, 18, ...)
 * Similar to Fibonacci but starts with 2, 1
 */
export function lucas(n: number): number[] {
    if (n <= 0) return [];
    if (n === 1) return [2];
    
    const sequence = [2, 1];
    
    for (let i = 2; i < n; i++) {
        sequence.push(sequence[i - 1] + sequence[i - 2]);
    }
    
    return sequence;
}

/**
 * Generates Pell numbers (0, 1, 2, 5, 12, 29, 70, ...)
 * Formula: P(n) = 2*P(n-1) + P(n-2)
 */
export function pell(n: number): number[] {
    if (n <= 0) return [];
    if (n === 1) return [0];
    
    const sequence = [0, 1];
    
    for (let i = 2; i < n; i++) {
        sequence.push(2 * sequence[i - 1] + sequence[i - 2]);
    }
    
    return sequence;
}

// ============================================================================
// NUMBER PROPERTY CHECKERS
// ============================================================================

/**
 * Checks if a number is prime
 */
export function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    
    const sqrt = Math.sqrt(n);
    for (let i = 3; i <= sqrt; i += 2) {
        if (n % i === 0) return false;
    }
    
    return true;
}

/**
 * Checks if a number is a Fibonacci number
 * A number is Fibonacci if one of (5*n^2 + 4) or (5*n^2 - 4) is a perfect square
 */
export function isFibonacci(n: number): boolean {
    const isPerfectSquare = (x: number) => {
        const s = Math.sqrt(x);
        return s === Math.floor(s);
    };
    
    return isPerfectSquare(5 * n * n + 4) || isPerfectSquare(5 * n * n - 4);
}

/**
 * Checks if a number is a perfect square
 */
export function isPerfectSquare(n: number): boolean {
    if (n < 0) return false;
    const sqrt = Math.sqrt(n);
    return sqrt === Math.floor(sqrt);
}

/**
 * Checks if a number is a perfect cube
 */
export function isPerfectCube(n: number): boolean {
    const cbrt = Math.cbrt(n);
    return Math.abs(cbrt - Math.round(cbrt)) < 1e-10;
}

/**
 * Checks if a number is triangular
 * A number n is triangular if 8n + 1 is a perfect square
 */
export function isTriangular(n: number): boolean {
    return isPerfectSquare(8 * n + 1);
}

/**
 * Checks if a number is pentagonal
 * A number n is pentagonal if (sqrt(24n + 1) + 1) / 6 is an integer
 */
export function isPentagonal(n: number): boolean {
    const test = (Math.sqrt(24 * n + 1) + 1) / 6;
    return test === Math.floor(test);
}

/**
 * Checks if a number is hexagonal
 * A number n is hexagonal if (sqrt(8n + 1) + 1) / 4 is an integer
 */
export function isHexagonal(n: number): boolean {
    const test = (Math.sqrt(8 * n + 1) + 1) / 4;
    return test === Math.floor(test);
}

/**
 * Checks if a number is a power of 2
 */
export function isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Checks if a number is a power of a given base
 */
export function isPowerOf(n: number, base: number): boolean {
    if (n <= 0 || base <= 1) return false;
    
    const logValue = Math.log(n) / Math.log(base);
    return Math.abs(logValue - Math.round(logValue)) < 1e-10;
}

/**
 * Checks if a number is even
 */
export function isEven(n: number): boolean {
    return n % 2 === 0;
}

/**
 * Checks if a number is odd
 */
export function isOdd(n: number): boolean {
    return n % 2 !== 0;
}

/**
 * Checks if a number is a palindrome
 */
export function isPalindrome(n: number): boolean {
    const str = Math.abs(n).toString();
    return str === str.split('').reverse().join('');
}

/**
 * Checks if a number is a perfect number
 * A perfect number equals the sum of its proper divisors (e.g., 6 = 1 + 2 + 3)
 */
export function isPerfectNumber(n: number): boolean {
    if (n < 2) return false;
    
    let sum = 1;
    const sqrt = Math.sqrt(n);
    
    for (let i = 2; i <= sqrt; i++) {
        if (n % i === 0) {
            sum += i;
            if (i !== n / i) {
                sum += n / i;
            }
        }
    }
    
    return sum === n;
}

/**
 * Checks if a number is an Armstrong number (Narcissistic number)
 * E.g., 153 = 1^3 + 5^3 + 3^3
 */
export function isArmstrong(n: number): boolean {
    const str = Math.abs(n).toString();
    const digits = str.length;
    let sum = 0;
    
    for (const char of str) {
        sum += Math.pow(parseInt(char), digits);
    }
    
    return sum === Math.abs(n);
}

/**
 * Checks if a number is a happy number
 * Eventually reaches 1 when replaced by sum of squares of digits
 */
export function isHappy(n: number): boolean {
    const seen = new Set<number>();
    
    while (n !== 1 && !seen.has(n)) {
        seen.add(n);
        let sum = 0;
        
        while (n > 0) {
            const digit = n % 10;
            sum += digit * digit;
            n = Math.floor(n / 10);
        }
        
        n = sum;
    }
    
    return n === 1;
}

/**
 * Checks if a number is an abundant number
 * Sum of proper divisors is greater than the number
 */
export function isAbundant(n: number): boolean {
    if (n < 2) return false;
    
    let sum = 1;
    const sqrt = Math.sqrt(n);
    
    for (let i = 2; i <= sqrt; i++) {
        if (n % i === 0) {
            sum += i;
            if (i !== n / i) {
                sum += n / i;
            }
        }
    }
    
    return sum > n;
}

/**
 * Checks if a number is deficient
 * Sum of proper divisors is less than the number
 */
export function isDeficient(n: number): boolean {
    if (n < 2) return false;
    
    let sum = 1;
    const sqrt = Math.sqrt(n);
    
    for (let i = 2; i <= sqrt; i++) {
        if (n % i === 0) {
            sum += i;
            if (i !== n / i) {
                sum += n / i;
            }
        }
    }
    
    return sum < n;
}

// ============================================================================
// NUMBER UTILITIES
// ============================================================================

/**
 * Calculates factorial of n
 */
export function factorial(n: number): number {
    if (n < 0) throw new Error("Factorial not defined for negative numbers");
    if (n === 0 || n === 1) return 1;
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    
    return result;
}

/**
 * Calculates greatest common divisor (GCD)
 */
export function gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    
    return a;
}

/**
 * Calculates least common multiple (LCM)
 */
export function lcm(a: number, b: number): number {
    return Math.abs(a * b) / gcd(a, b);
}

/**
 * Gets all divisors of a number
 */
export function getDivisors(n: number): number[] {
    const divisors: number[] = [];
    const sqrt = Math.sqrt(n);
    
    for (let i = 1; i <= sqrt; i++) {
        if (n % i === 0) {
            divisors.push(i);
            if (i !== n / i) {
                divisors.push(n / i);
            }
        }
    }
    
    return divisors.sort((a, b) => a - b);
}

/**
 * Gets prime factors of a number
 */
export function getPrimeFactors(n: number): number[] {
    const factors: number[] = [];
    
    while (n % 2 === 0) {
        factors.push(2);
        n /= 2;
    }
    
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
        while (n % i === 0) {
            factors.push(i);
            n /= i;
        }
    }
    
    if (n > 2) {
        factors.push(n);
    }
    
    return factors;
}

/**
 * Calculates the sum of digits
 */
export function sumOfDigits(n: number): number {
    let sum = 0;
    n = Math.abs(n);
    
    while (n > 0) {
        sum += n % 10;
        n = Math.floor(n / 10);
    }
    
    return sum;
}

/**
 * Calculates the digital root (recursive sum of digits until single digit)
 */
export function digitalRoot(n: number): number {
    n = Math.abs(n);
    
    while (n >= 10) {
        n = sumOfDigits(n);
    }
    
    return n;
}

/**
 * Reverses the digits of a number
 */
export function reverseDigits(n: number): number {
    const isNegative = n < 0;
    const reversed = parseInt(Math.abs(n).toString().split('').reverse().join(''));
    return isNegative ? -reversed : reversed;
}

/**
 * Checks if two numbers are coprime (GCD = 1)
 */
export function areCoprime(a: number, b: number): boolean {
    return gcd(a, b) === 1;
}