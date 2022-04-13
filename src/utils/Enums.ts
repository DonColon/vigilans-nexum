export function numberEnumKeys(enumObject: object): string[]
{
    return Object.keys(enumObject)
            .filter(key => Number.isNaN(Number(key)));
}

export function numberEnumValues(enumObject: object): number[]
{
    return Object.values(enumObject)
            .filter(value => !Number.isNaN(Number(value)));
}

export function stringEnumExists(enumObject: object, value: string): boolean
{
    return Object.values(enumObject)
            .includes(value);
}

export function mixedEnumKeys(enumObject: object): string[]
{
    return numberEnumKeys(enumObject);
}

export function mixedEnumValues(enumObject: object): (number | string)[]
{
    return Object.values(enumObject).filter(value => {
        const keys = mixedEnumKeys(enumObject);
        return !keys.includes(value);
    });
}

export function mixedEnumExists(enumObject: object, value: number | string): boolean
{
    if(typeof value === "number") {
        return value in enumObject;
    }
    else if(typeof value === "string") {
        return stringEnumExists(enumObject, value);
    }

    return false;
}