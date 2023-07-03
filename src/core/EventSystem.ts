type EventHandler<Events, K extends keyof Events = any> = (event: Events[K]) => void;


export class EventSystem<Events, BaseEvent>
{
    private subscribers: Map<keyof Events, EventHandler<Events>[]> = new Map<keyof Events, EventHandler<Events>[]>();


    public subscribe<K extends keyof Events>(eventName: K, handler: EventHandler<Events, K>)
    {
        const handlers = this.subscribers.get(eventName) || [];
        handlers.push(handler);

        this.subscribers.set(eventName, handlers);
    }

    public unsubscribe<K extends keyof Events>(eventName: K, handler: EventHandler<Events, K>)
    {
        let handlers = this.subscribers.get(eventName) || [];
        handlers = handlers.filter(subscriber => subscriber !== handler);

        this.subscribers.set(eventName, handlers);
    }

    public dispatch<K extends keyof Events>(eventName: K, data: Omit<Events[K], keyof BaseEvent>)
    {
        const handlers = this.subscribers.get(eventName) || [];

        const event = {
            type: eventName,
            timestamp: Date.now(),
            ...data
        } as Events[K];
        
        for(const handler of handlers) {
            handler(event);
        }
    }
}