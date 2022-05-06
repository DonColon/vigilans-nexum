import { HasName } from "./JsonConversion";
import { Query } from "./Query";


export interface SystemConstructor extends HasName
{
    new(priority: number): System,
}


export abstract class System
{
    static jsonName: string;

    protected priority: number;
    protected enabled: boolean;

    protected queries: {
        [queryName: string]: Query
    }


    constructor(priority: number)
    {
        this.priority = priority;
        this.enabled = true;
        this.queries = {};
        this.initialize();
    }


    public static byPriority(value: System, other: System): number
    {
        return value.priority - other.priority;
    }


    public abstract initialize(): void;
    public abstract execute(elapsed: number): void;


    public getPriority(): number
    {
        return this.priority;
    }

    public isEnabled(): boolean
    {
        return this.enabled;
    }

    public enable()
    {
        this.enabled = true;
    }

    public disable()
    {
        this.enabled = false;
    }
}