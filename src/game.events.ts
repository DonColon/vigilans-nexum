import { GameEvent } from "@/core/events/GameEvent";

/** The player pressed confirm on a battle map tile. */
export interface TileConfirmedEvent extends GameEvent {
	column: number;
	row: number;
	/** Terrain id of the tile, e.g. "plain" / "fort". */
	terrain: string;
}

/** The player chose a row in an open menu. The menu has already closed. */
export interface MenuConfirmedEvent extends GameEvent {
	/** `id` of the menu, as passed to `MenuState.request`. */
	menu: string;
	index: number;
	item: string;
}

/** The player backed out of an open menu without choosing. */
export interface MenuCancelledEvent extends GameEvent {
	menu: string;
}

/** A textbox finished and closed. */
export interface DialogClosedEvent extends GameEvent {
	dialog: string;
}

declare module "@/core/events/GameEvents" {
	interface GameEvents {
		"map:tileConfirmed": TileConfirmedEvent;
		"ui:menuConfirmed": MenuConfirmedEvent;
		"ui:menuCancelled": MenuCancelledEvent;
		"ui:dialogClosed": DialogClosedEvent;
	}
}
