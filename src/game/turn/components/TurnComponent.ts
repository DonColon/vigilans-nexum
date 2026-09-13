import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface TurnData extends JsonSchema {
	/** The current turn, counting from 1. */
	number: number;
	/**
	 * The turn is over and waits for the map to be quiet - no experience bar,
	 * popup or animation left over the map from the last action - before the
	 * next one starts. `TurnSystem` completes it.
	 */
	ending: boolean;
}

/**
 * The battle's turn counter. One instance, created with the map and read by the
 * HUD. `TurnFeature` marks it ending - manually from the "end turn" command, or
 * on its own once every player unit has acted - and `TurnSystem` bumps it once
 * the map is on top again.
 */
export class TurnComponent extends Component<TurnData> {
	public static readonly type = "turn";
}
