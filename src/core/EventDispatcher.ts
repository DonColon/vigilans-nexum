import { GameEvent, GameEventListener, GameEventMap } from "./GameEvent";


export abstract class EventDispatcher
{
    private events: Map<string, GameEventListener[]> = new Map<string, GameEventListener[]>();


    public on<K extends keyof GameEventMap>(type: K, listener: GameEventListener)
    {
        const listeners = this.events.get(type) || [];
        listeners.push(listener);

        this.events.set(type, listeners);
    }

    public dispatch<K extends keyof GameEventMap>(type: K, event: Omit<GameEventMap[K], keyof GameEvent>)
    {
        const listeners = this.events.get(type) || [];

        const gameEvent: GameEventMap[K] = {
            type: type,
            timestamp: Date.now(),
            ...event
        }
        
        for(const listener of listeners) {
            listener(gameEvent);
        }
    }
}