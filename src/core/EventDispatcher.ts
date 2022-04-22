import { WorldEvent } from "./WorldEvent";


type EventListener = (event: WorldEvent) => void;


export abstract class EventDispatcher
{
    private events: Map<string, Set<EventListener>>;


    constructor()
    {
        this.events = new Map<string, Set<EventListener>>();
    }


    public on(eventName: string, listener: EventListener)
    {
        const listeners = this.events.get(eventName) || new Set<EventListener>();
        listeners.add(listener);

        this.events.set(eventName, listeners);
    }

    public dispatch(eventName: string, event: WorldEvent)
    {
        const listeners = this.events.get(eventName) || [];

        for(const listener of listeners) {
            listener(event);
        }
    }
}