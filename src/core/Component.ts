type JsonType = (string | number | boolean | object | string[] | number[] | boolean[] | object[] | null);


interface ComponentConstructor extends Function
{
    componentName: string
}


export function JsonName(name: string)
{
    return (target: Function) => {
        const component = target as ComponentConstructor;
        component.componentName = name;
    }
}


export abstract class Component<T>
{
    static componentName: string;
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