import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface PopupData extends JsonSchema {
	/** Stable name of this popup, echoed by the `ui:popupClosed` event. */
	id: string;
	/** Heading across the top of the panel, or "" for a popup that is only its lines. */
	title: string;
	/** The lines of the notice, centred one under the other. Short enough to fit - a popup does not wrap. */
	lines: string[];
	/** Set by the dismiss input; the popup system pops the state on the next tick. */
	closed: boolean;
}

/**
 * A small notice the player has to acknowledge - Fire Emblem's "you got an
 * item" box. It says one thing, in the middle of the screen, and any press
 * dismisses it: no pages, no reveal, no choice. A textbox would be the wrong
 * shape for it, which is why it is not one.
 */
export class PopupComponent extends Component<PopupData> {
	public static readonly type = "popup";
}
