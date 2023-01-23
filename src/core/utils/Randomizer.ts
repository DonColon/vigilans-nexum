import { Tuple } from "./Arrays";


interface Range 
{
    min?: number,
    max?: number
}


export namespace Randomizer
{
    export function randomInteger(range: Range): number
    {
        const min = range.min || 0;
        const max = range.max || Number.MAX_SAFE_INTEGER; 
    
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    export function randomIntegers<L extends number>(length: L, range: Range): Tuple<number, L>
    {
        const values = [];
    
        for(let i = 0; i < length; i++) {
            const value = randomInteger(range);
            values.push(value);
        }
    
        return values as Tuple<number, L>;
    }
    
    export function randomDecimal(range: Range): number
    {
        const min = range.min || 0;
        const max = range.max || Number.MAX_VALUE;
    
        return Math.random() * (max - min + 1) + min;
    }
    
    export function randomDecimals<L extends number>(length: L, range: Range): Tuple<number, L>
    {
        const values = [];
    
        for(let i = 0; i < length; i++) {
            const value = randomDecimal(range);
            values.push(value);
        }
    
        return values as Tuple<number, L>;
    }
    
    export function randomBoolean(): boolean
    {
        return Math.round(Math.random()) === 1;
    }
    
    export function randomBooleans<L extends number>(length: L): Tuple<boolean, L>
    {
        const values = [];
    
        for(let i = 0; i < length; i++) {
            const value = randomBoolean();
            values.push(value);
        }
    
        return values as Tuple<boolean, L>;
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
    
    export function anyOf<T>(items: T[]): T | undefined
    {
        const index = randomInteger({ max: items.length - 1 });
        return items.at(index);
    }
}