type JsonType = (string | number | boolean | object | string[] | number[] | boolean[] | object[] | null);


export function ComponentName(name: string) {
    return (target: Function) => {
        target.prototype.componentName = name;
    }
}


export abstract class Component<T>
{
    [key: string]: JsonType;


    constructor(parameters: T) 
    {
        for(const [key, value] of Object.entries(parameters)) {
            this[key] = value;
        }
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