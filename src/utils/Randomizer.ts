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


export function randomUUID(): string
{
    let current = Date.now();

    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
        const random = randomInteger({ max: 16 });

        const hexCode = (current + random) % 16;
        current = Math.floor(current / 16);

        if(current === 0) current = Date.now();

        return (value === "x" ? hexCode : hexCode % 4 + 8).toString(16); 
    });

    return uuid;
}


export function anyOf<T>(items: T[]): T
{
    return items.at(randomInteger({ max: items.length - 1 })) as T;
}