import { GameError } from "@/core/GameError";
import { GameState, GameStateConstructor } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";

@GameCoreService()
export class GameStateManager {
	private readonly states: Map<string, GameState> = new Map<string, GameState>();
	private readonly currentStates: GameState[] = [];

	public switch(stateType: GameStateConstructor | string) {
		const state = this.getState(stateType);

		if (this.currentStates.length > 0) {
			const currentState = this.peek();

			if (currentState !== null) {
				currentState.onExit();
			}
		}

		state.onEnter();

		this.currentStates.length = 0;
		this.currentStates.push(state);
	}

	public push(stateType: GameStateConstructor | string) {
		const state = this.getState(stateType);

		if (this.currentStates.length > 0) {
			const currentState = this.peek();

			if (currentState !== null) {
				currentState.onPause();
			}
		}

		state.onEnter();
		this.currentStates.push(state);
	}

	public pop(): GameState {
		const currentState = this.currentStates.pop();
		const state = this.peek();

		if (currentState === undefined) {
			throw new GameError("No states defined in stack");
		}

		currentState.onExit();

		if (state !== null) {
			state.onResume();
		}

		return currentState;
	}

	public peek(): GameState | null {
		const currentState = this.currentStates.at(-1);
		return currentState ?? null;
	}

	public clear() {
		this.states.clear();
		this.currentStates.length = 0;
	}

	public registerState(stateType: GameStateConstructor): this {
		if (stateType.type === GameState.type) {
			throw new GameError(`State ${stateType.name} must declare its own static type`);
		}

		if (this.states.has(stateType.type)) {
			throw new GameError(`State ${stateType.type} is already registered`);
		}

		const state = new stateType();
		this.states.set(stateType.type, state);

		return this;
	}

	public unregisterState(stateType: GameStateConstructor): this {
		this.states.delete(stateType.type);
		return this;
	}

	public getState(stateType: GameStateConstructor | string): GameState {
		const name = typeof stateType === "string" ? stateType : stateType.type;
		const state = this.states.get(name);

		if (state === undefined) {
			throw new GameError(`State ${name} is not registered`);
		}

		return state;
	}

	public getCurrentStates(): GameState[] {
		return this.currentStates;
	}

	public getRegisteredStates(): GameState[] {
		return Array.from(this.states.values());
	}
}
