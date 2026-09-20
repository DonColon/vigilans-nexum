import { EntityType } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { Display } from "@/core/graphics/Display";
import { GameStateManager } from "@/core/GameStateManager";
import { GameStateConstructor } from "@/core/GameState";

/**
 * What the framework itself puts in a save: the slot's header - when it was
 * written, how long it has been played, a picture of the screen - and the
 * world as it stood, the state stack as a list of `static type` ids and
 * every entity as `entity.toObject()`.
 *
 * A game adds what is its own by merging into [[Savegame]] (see
 * `src/database.schema.ts`): every save then carries both, in one record of
 * the `savegames` store, and the slot list reads the header off any of them.
 */
export interface SavegameCore {
	/** The slot - the store's key. */
	id: number;
	/** Milliseconds played, over every session. */
	playtime: number;
	/** ISO timestamp of the write. */
	modifiedOn: string;
	/** The screen as it was when the save was written, as a small JPEG data URL - the slot's thumbnail. */
	screenshot: string;
	/** The state stack, bottom first, as the states' `static type` ids. */
	currentState: string[];
	/** Every entity, as `entity.toObject()`. */
	entities: EntityType[];
}

/**
 * One save slot. The framework's part is [[SavegameCore]]; the game merges
 * its own fields into this interface, and [[SavegameExtension]] is what it
 * hands `Game.save` to fill them.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Savegame extends SavegameCore {}

/** The game's part of a save - every field of [[Savegame]] the framework does not write itself. */
export type SavegameExtension = Omit<Savegame, keyof SavegameCore>;

/** Size of the thumbnail a save keeps: the display's own 2:1, small enough to keep a few of in the store. */
export const SAVEGAME_THUMBNAIL = { width: 384, height: 192 } as const;

/**
 * The framework's part of a save as the world stands right now: the header
 * with `playtime`, the screen's thumbnail, the state stack and every entity.
 * `Game.save` and any feature that writes a save build their record on it.
 */
export function snapshotWorld(world: World, stateManager: GameStateManager, display: Display, id: number, playtime: number): SavegameCore {
	return {
		id,
		playtime,
		modifiedOn: new Date().toISOString(),
		screenshot: display.thumbnail(SAVEGAME_THUMBNAIL.width, SAVEGAME_THUMBNAIL.height),
		currentState: stateManager.getCurrentStates().map((state) => (state.constructor as GameStateConstructor).type),
		entities: world.getEntities().map((entity) => entity.toObject())
	};
}
