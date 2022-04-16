interface Range 
{
    min?: number,
    max?: number
}


export function randomInteger(range: Range): number
{
    const min = range.min || 0;
    const max = range.max || Number.MAX_SAFE_INTEGER; 

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomIntegers(size: number, range: Range): number[]
{
    const values = [];

    for(let i = 0; i < size; i++) {
        const value = randomInteger(range);
        values.push(value);
    }

    return values;
}


export function randomDecimal(range: Range): number
{
    const min = range.min || 0;
    const max = range.max || Number.MAX_VALUE;

    return Math.random() * (max - min + 1) + min;
}

export function randomDecimals(size: number, range: Range): number[]
{
    const values = [];

    for(let i = 0; i < size; i++) {
        const value = randomDecimal(range);
        values.push(value);
    }

    return values;
}


export function randomBoolean(): boolean
{
    return Math.round(Math.random()) === 1;
}

export function randomBooleans(size: number): boolean[]
{
    const values = [];

    for(let i = 0; i < size; i++) {
        const value = randomBoolean();
        values.push(value);
    }

    return values;
}


export function anyOf<T>(items: T[]): T
{
    return items.at(randomInteger({ max: items.length - 1 })) as T;
}