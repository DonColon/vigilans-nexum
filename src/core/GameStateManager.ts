import { GameState } from "./GameState";


export class GameStateManager
{
    private currentStates: GameState[];


    constructor()
    {
        this.currentStates = [];
    }


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
        return this.currentStates.pop() as GameState;
    }

    public peek(): GameState
    {
        return this.currentStates.at(-1) as GameState;
    }
}