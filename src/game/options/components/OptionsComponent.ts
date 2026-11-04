import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface OptionsData extends JsonSchema {
	/** Ids of the settings listed, in the order they are drawn. */
	optionIds: string[];
	/** Row the highlight sits on. */
	selectedIndex: number;
	/** Set by the close input; the options system pops the state on the next tick. */
	closed: boolean;
}

/**
 * The options screen on show: which settings it lists and which row the player
 * is on. The *values* are not here - they live on the [[OptionsService]], which
 * outlives the screen and is what the rest of the game reads. This only tracks
 * what is on screen.
 */
export class OptionsComponent extends Component<OptionsData> {
	public static readonly type = "options";
}
