import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Outcome } from "@/game/objective/components/ObjectiveComponent";

export interface OutcomeData extends JsonSchema {
	outcome: Outcome;
	/** The turn the battle was decided on - the banner's small line. */
	turn: number;
	/** Milliseconds the banner has been up; `ObjectiveSystem` advances it. */
	elapsed: number;
	/** The player has pressed on it, once it was up long enough to be read. */
	acknowledged: boolean;
}

/**
 * The outcome banner on screen - "Victory" or "Defeat" sweeping in and then
 * holding until the player presses. One at a time, on its own entity, created
 * by [[OutcomeState]]; `ObjectiveSystem` runs the clock and the press,
 * `OutcomeRenderSystem` draws it as far in as the clock says.
 */
export class OutcomeComponent extends Component<OutcomeData> {
	public static readonly type = "outcome";
}
