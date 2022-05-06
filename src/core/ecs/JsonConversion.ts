export type JsonType = (string | number | boolean | object | string[] | number[] | boolean[] | object[] | null);


export interface HasName
{
    jsonName: string
}


export function JsonName(name: string)
{
    return (target: Function) => {
        const constructor = target as unknown as HasName;
        constructor.jsonName = name;
    }
}