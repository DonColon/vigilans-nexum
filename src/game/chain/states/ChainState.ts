import { GameState } from "@/core/GameState";

/**
 * On the stack for the whole of a chain attack, so the map stays frozen in the
 * gaps between the three strikes and the outcome banner waits for the last of
 * them. It allows no commands of its own. [[ChainSystem]] sends the next strike
 * while it is on top - a fight or an experience bar goes over it and it waits -
 * and pops it when the chain is done.
 */
export class ChainState extends GameState {
	public static readonly type = "chain";

	public onEnter(): void {
		this.resetCommands();
	}

	public onExit(): void {}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}
}
