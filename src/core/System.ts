import { Query } from "./Query";


export abstract class System
{
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


    public static compare(value: System, other: System): number
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