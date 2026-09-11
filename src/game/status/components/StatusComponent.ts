import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface StatusData extends JsonSchema {
	/** Ids of every unit the screen can page through, in the order left and right walk them. */
	unitIds: string[];
	/** Which of them is on the page. */
	index: number;
	/** Set by the close input; the status system pops the state on the next tick. */
	closed: boolean;
}

/**
 * The unit sheet on screen: which units it can page through and which one is
 * up. It holds ids rather than a copy of the sheet, so what is drawn is always
 * the live unit - the same reason the army list does.
 */
export class StatusComponent extends Component<StatusData> {
	public static readonly type = "status";
}
