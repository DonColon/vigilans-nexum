import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface ObjectiveScreenData extends JsonSchema {
	/** Set by the close input; the screen system pops the state on the next tick. */
	closed: boolean;
}

/**
 * The objective screen on screen - the readout of what the battle is won and
 * lost by. It holds nothing but whether the player has closed it: what it
 * says is read live off the [[ObjectiveComponent]], the turn counter and the
 * units still on the map, so the enemy count is always the one that is true.
 */
export class ObjectiveScreenComponent extends Component<ObjectiveScreenData> {
	public static readonly type = "objectiveScreen";
}
