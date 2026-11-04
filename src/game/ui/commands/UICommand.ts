import { Entity } from "@/core/ecs/Entity";
import { GameCommand } from "@/core/input/commands/GameCommand";

/**
 * What a dialog command is handed each tick. The dialog system owns the query
 * behind the entity and measures the current page for the command, so the
 * command only has to decide what the press means.
 */
export interface DialogCommandContext {
	/** Entity carrying the open dialog. */
	dialog: Entity;
	/** Whether every word of the current page is already on screen. */
	fullyRevealed: boolean;
}

/** What a menu command is handed each tick. */
export interface MenuCommandContext {
	/** Entity carrying the open menu. */
	menu: Entity;
}

/**
 * Input the player can trigger while a textbox is on screen: advancing the
 * reveal, turning the page, closing the box. Listed by DialogState, run by
 * DialogSystem.
 */
export abstract class DialogCommand extends GameCommand<DialogCommandContext> {}

/**
 * Input the player can trigger while a menu is on screen: moving the highlight,
 * confirming a row, backing out. Listed by MenuState, run by MenuSystem.
 */
export abstract class MenuCommand extends GameCommand<MenuCommandContext> {}

/** What a popup command is handed each tick. */
export interface PopupCommandContext {
	/** Entity carrying the open popup. */
	popup: Entity;
}

/**
 * Input the player can trigger while a notice is on screen. There is only one
 * thing to do with a popup - acknowledge it - so this is the whole vocabulary.
 * Listed by PopupState, run by PopupSystem.
 */
export abstract class PopupCommand extends GameCommand<PopupCommandContext> {}
