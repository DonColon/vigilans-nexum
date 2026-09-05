import { GameCommand } from "@/core/input/commands/GameCommand";

export interface GlobalCommandConstructor {
	new (): GlobalCommand;
}

/**
 * Command that applies no matter what the game is currently showing, such as
 * toggling fullscreen or taking a screenshot. It carries out its action
 * itself, because there is no state that would list it and no entity it works
 * on - a CommandSystem drives it.
 */
export abstract class GlobalCommand extends GameCommand {}
