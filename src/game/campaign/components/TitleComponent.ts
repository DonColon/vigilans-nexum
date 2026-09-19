import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface TitleData extends JsonSchema {
	/** Milliseconds the title has been up; `CampaignSystem` advances it, the renderer fades the screen in by it. */
	elapsed: number;
	/** Whether a save was found for the slot - the "Continue" row is offered only then. */
	hasSave: boolean;
	/** The title menu has been put up - once, when the store has answered. */
	menuOpened: boolean;
}

/**
 * The title screen: what is on screen while [[TitleState]] is on the stack.
 * One at a time, created by the state; the menu over it is the UI feature's,
 * pushed by [[CampaignFlowSystem]] once the store has said whether there is a
 * run to continue.
 */
export class TitleComponent extends Component<TitleData> {
	public static readonly type = "title";

	/** A fresh title screen, the store not yet asked. */
	public static open(): TitleData {
		return { elapsed: 0, hasSave: false, menuOpened: false };
	}

	public static advanced(data: TitleData, elapsed: number): TitleData {
		return { ...data, elapsed: data.elapsed + elapsed };
	}
}
