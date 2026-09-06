import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface TurnData extends JsonSchema {
	/** The current turn, counting from 1. */
	number: number;
}

/**
 * The battle's turn counter. One instance, created with the map and read by the
 * HUD. `TurnFeature` bumps it - manually from the "end turn" command, or on its
 * own once every player unit has acted.
 */
export class TurnComponent extends Component<TurnData> {
	public static readonly type = "turn";
}
