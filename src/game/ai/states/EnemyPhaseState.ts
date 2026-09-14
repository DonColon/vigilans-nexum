import { GameState } from "@/core/GameState";

/**
 * On the stack for the whole of the enemy phase, so the map cursor and every
 * command freeze the way they do for a fight animation - MapState's commands
 * only run while it is on top. It allows no commands of its own: the enemy
 * cannot be hurried or interrupted.
 *
 * It owns nothing. `EnemyPhaseSystem` pushes it once the phase banner has
 * gone, moves the enemy's units while it is on top - a fight or an experience
 * bar goes over it and it waits - and pops it once the phase is over.
 */
export class EnemyPhaseState extends GameState {
	public static readonly type = "enemy-phase";

	public onEnter(): void {
		this.resetCommands();
	}

	public onExit(): void {}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}
}
