import { HasName, JsonType } from "./JsonConversion";


export interface ComponentConstructor<T> extends HasName
{
    new(parameters: T): Component<T>
    isTag: boolean
}


export function Tag()
{
    return (target: Function) => {
        const constructor = target as ComponentConstructor<any>;
        constructor.isTag = true;
    }
}


export abstract class Component<T>
{
    static jsonName: string;
    static isTag: boolean;

    [key: string]: JsonType;


    constructor(parameters: T) 
    {
        this.set(parameters);
    }


    public set(component: T)
    {
        for(const [key, value] of Object.entries(component)) {
            this[key] = value;
        }
    }
    
    public json(): T 
    {
        return JSON.parse(JSON.stringify(this)) as T;
    }
}