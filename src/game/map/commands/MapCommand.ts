import { Entity } from "@/core/ecs/Entity";
import { GameCommand } from "@/core/input/commands/GameCommand";

/**
 * Everything a map command is allowed to work on. Assembled once per update by
 * the system that owns the queries behind it, so a command never has to look
 * the entities up itself - which components it reads or writes on them is up
 * to the command.
 */
export interface MapCommandContext {
	/** Entity carrying the grid of the active map. */
	map: Entity;
	/** Entity carrying the cursor of the active map. */
	cursor: Entity;
}

/**
 * Command the player can trigger while a battle map is on screen. It knows
 * what a press means for the map - moving the cursor, confirming, cancelling -
 * but not when it is allowed to happen or where the map is: the MapState lists
 * it and the system driving the map hands its context to `execute`.
 */
export abstract class MapCommand extends GameCommand<MapCommandContext> {}
