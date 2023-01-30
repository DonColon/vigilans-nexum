import { GameError } from "./GameError";
import { GameState } from "./GameState";


export class GameStateManager
{
    private currentStates: GameState[] = [];


    public switch(state: GameState)
    {
        const currentState = this.peek();

        currentState.onExit();
        state.onEnter();

        this.currentStates.length = 0;
        this.currentStates.push(state);
    }

    public push(state: GameState)
    {
        const currentState = this.peek();

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
}