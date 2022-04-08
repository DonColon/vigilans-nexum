export function isDivisibleBy(number: number, divisor: number) {
    return number % divisor === 0;
}

export function isEven(number: number) {
    return isDivisibleBy(number, 2);
}

export function isOdd(number: number) {
    return number % 2 === 1;
}

export function isPowerOf(number: number, base: number) {
    if(number === 0) return false;

    const exponent = Math.log(number) / Math.log(base);
    return Math.ceil(exponent) === Math.floor(exponent);
}

export function isPrime(number: number) {
    if(number <= 1) return false;

    for(let i = 2; i < number; i++) {
        if(number % i === 0) {
            return false;
        }
    }

    return true;
}

export function isFibonacci(number: number) {
    return isPerfectSquare(5 * number * number + 4)
        || isPerfectSquare(5 * number * number - 4);
}

function isPerfectSquare(number: number) {
    const side = Math.sqrt(number);
    return side * side === number;
}