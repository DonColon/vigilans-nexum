import { GameError } from "./GameError";
import { GameState, GameStateConstructor } from "./GameState";


export class GameStateManager
{
    private states: Map<string, GameState> = new Map<string, GameState>();
    private currentStates: GameState[] = [];


    public switch(stateType: GameStateConstructor | string)
    {
        const currentState = this.peek();
        const state = this.getState(stateType);

        currentState.onExit();
        state.onEnter();

        this.currentStates.length = 0;
        this.currentStates.push(state);
    }

    public push(stateType: GameStateConstructor | string)
    {
        const currentState = this.peek();
        const state = this.getState(stateType);

        currentState.onExit();
        state.onEnter();

        this.currentStates.push(state);
    }

    public pop(): GameState
    {
        const currentState = this.currentStates.pop();
        const state = this.peek();

        if(currentState === undefined) {
            throw new GameError("No states defined in stack");
        }
        
        currentState.onExit();
        state.onEnter();

        return currentState;
    }

    public peek(): GameState
    {
        const currentState = this.currentStates.at(-1);

        if(currentState === undefined) {
            throw new GameError("No states defined in stack");
        }

        return currentState;
    }

    public clear()
    {
        this.states.clear();
        this.currentStates.length = 0;
    }


    public registerState(stateType: GameStateConstructor): this
    {
        if(this.states.has(stateType.name)) {
            throw new GameError(`State ${stateType.name} is already registered`);
        }

        const state = new stateType();
        this.states.set(stateType.name, state);

        return this;
    }

    public unregisterState(stateType: GameStateConstructor): this
    {
        this.states.delete(stateType.name);
        return this;
    }

    public getState(stateType: GameStateConstructor | string): GameState
    {
        const name = (typeof stateType === "string") ? stateType : stateType.name;
        const state = this.states.get(name);

        if(state === undefined) {
            throw new GameError(`State ${name} is not registered`);
        }

        return state;
    }

    public getCurrentStates(): GameState[]
    {
        return this.currentStates;
    }
}