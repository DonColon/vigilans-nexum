import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface RosterData extends JsonSchema {
	/** Ids of the units listed, in the order they are drawn. */
	unitIds: string[];
	/** Row the highlight sits on. */
	selectedIndex: number;
	/** Set by the close input; the roster system pops the state on the next tick. */
	closed: boolean;
}

/**
 * The army list on screen: which units it covers and which row the player is
 * looking at. It holds ids rather than a copy of the sheets, so the numbers
 * drawn are always the live ones - a unit that takes a hit while the list is up
 * shows the HP it actually has.
 */
export class RosterComponent extends Component<RosterData> {
	public static readonly type = "roster";
}
