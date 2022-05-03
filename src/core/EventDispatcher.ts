import { GameEventListener, GameEventMap } from "./GameEvent";


export abstract class EventDispatcher
{
    private events: Map<string, Set<GameEventListener>>;


    constructor()
    {
        this.events = new Map<string, Set<GameEventListener>>();
    }


    public on(type: string, listener: GameEventListener)
    {
        const listeners = this.events.get(type) || new Set<GameEventListener>();
        listeners.add(listener);

        this.events.set(type, listeners);
    }

    public dispatch<K extends keyof GameEventMap>(type: string, event: GameEventMap[K])
    {
        const listeners = this.events.get(type) || [];

        event.type = type;
        event.timestamp = Date.now();

        for(const listener of listeners) {
            listener(event);
        }
    }
}