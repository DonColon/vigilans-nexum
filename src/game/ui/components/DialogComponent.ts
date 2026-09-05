import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface DialogData extends JsonSchema {
	/** Stable name of this dialog, echoed by the `ui:dialogClosed` event. */
	id: string;
	/** Name shown above the body, or "" for narration with no speaker. */
	speaker: string;
	/**
	 * The dialog broken into pages. Each entry is one page of raw text; the
	 * renderer word-wraps it to the box width, so a page may end up taller than
	 * it looks here. A newline forces a hard break within a page.
	 */
	pages: string[];
	/** Page currently on screen. */
	pageIndex: number;
	/** Milliseconds the current page has been on screen, driving the word reveal. */
	pageElapsed: number;
	/** Set by the advance input to skip the reveal and show the whole page at once. */
	revealAll: boolean;
	/** Set by the advance input on the last page; the dialog system pops the state on the next tick. */
	closed: boolean;
}

/**
 * A textbox: some pages of text that reveal themselves a word at a time and
 * wait for the player to move on. The entity carrying this also carries a
 * TransformComponent for its screen position; how wide the box is comes from
 * the theme, how tall from the text.
 */
export class DialogComponent extends Component<DialogData> {
	public static readonly type = "dialog";
}
