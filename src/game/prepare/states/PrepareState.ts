import { GameState } from "@/core/GameState";
import { moveCursorCommands } from "@/game/map/commands/MoveCursorCommand";
import { prepareCommands } from "@/game/prepare/commands/PrepareCommands";

/**
 * The preparations screen, on the stack over the battle map from the moment
 * the map is up until the battle begins. It freezes the map's own commands -
 * confirm on a tile would pick a unit up to move it - and allows two things:
 * moving the cursor, with the map's own cursor commands, and the prepare
 * confirm / cancel, which mean different things by the mode the record is in.
 * The preparations menu and the pick, items and convoy menus are MenuStates
 * pushed over this one by [[PrepareFlowSystem]].
 *
 * It owns no entity: the record lives with the map, on the flow's entity,
 * because it outlives the menus stacked over this state.
 */
export class PrepareState extends GameState {
	public static readonly type = "prepare";

	protected commands = [...moveCursorCommands, ...prepareCommands];

	public onEnter(): void {
		this.resetCommands();
	}

	public onExit(): void {}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}
}
