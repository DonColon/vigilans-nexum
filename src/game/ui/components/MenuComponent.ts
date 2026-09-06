import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface MenuData extends JsonSchema {
	/** Stable name of this menu, echoed by the `ui:menuConfirmed` / `ui:menuCancelled` events. */
	id: string;
	/** Heading shown above the rows, or "" for none. */
	title: string;
	/** Panel width in pixels - the state and the renderer read it from here so they agree. */
	width: number;
	/** The rows, top to bottom. */
	items: string[];
	/** Row the highlight is on. */
	selectedIndex: number;
	/** Row the player confirmed, or -1 while the menu is still open. */
	confirmedIndex: number;
	/** Set when the player backs out; the menu system pops the state on the next tick. */
	cancelled: boolean;
}

/**
 * A vertical list the player moves a highlight through and confirms a row of.
 * Drawn in the same framed panel as a dialog. The menu never acts on a choice
 * itself - it reports the row through an event and closes; whoever opened it
 * decides what the row means.
 */
export class MenuComponent extends Component<MenuData> {
	public static readonly type = "menu";
}
