import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface PendingMoveData extends JsonSchema {
	/** Tile the unit stood on before this move - where "Back" from the command menu returns it. */
	originColumn: number;
	originRow: number;
}

/**
 * A unit that has walked to a tile but not yet confirmed the move - the command
 * menu is open over it. "Wait" finalises (the component is dropped, the unit is
 * spent); backing out reverts it to `origin` and re-opens the movement range.
 */
export class PendingMoveComponent extends Component<PendingMoveData> {
	public static readonly type = "pendingMove";
}
