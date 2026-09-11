import { GameError } from "@/core/GameError";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { i18n } from "@/core/i18n/I18n";
import { PopupRequest } from "@/game/ui/states/PopupState";
import { catalogName } from "@/game/units/model/UnitCatalog";

/**
 * The locked doors and chests on a battle map - Fire Emblem's "Door" and
 * "Chest". They are authored per scenario in
 * `src/assets/data/locks/*.locks.json` and shipped as JSON assets, so where
 * the locks are and what the chests hold is content, the same way the houses
 * and the conversations are.
 *
 * A lock names the tile it sits on and the frame it shows once opened. The
 * *closed* look is whatever the map already draws there - a shut door in a
 * wall, a closed chest on the floor - so the map stays the one place that says
 * what a locked thing looks like; only the open frame has to be named here.
 *
 * A closed door is a wall as far as movement goes and an open one is plain
 * ground: its terrain is not authored, it follows from opening. A chest's tile
 * is walked onto shut or open, so its terrain is whatever the map gave the
 * closed frame.
 */

// The on-disk shapes, like HouseDocument: fields may be left out here, and only
// the validated [[Door]] / [[Chest]] below are stored on a component.
export interface DoorDocument {
	id: string;
	/** Tile the door stands on - a unit opens it from a tile next to this one. */
	column: number;
	row: number;
	/** Frame the tile shows once the door is open. */
	openFrame: number;
}

export interface ChestDocument {
	id: string;
	/** Tile the chest stands on - a unit opens it standing on this one. */
	column: number;
	row: number;
	/** Frame the tile shows once the chest is open. */
	openFrame: number;
	/** Catalog id of the weapon or item inside. Left out for a chest that is bare. */
	reward?: string;
}

/** An on-disk lock sheet, one per scenario. */
export interface LocksDocument {
	format: "vigilans-locks";
	version: 1;
	doors: DoorDocument[];
	chests: ChestDocument[];
}

/** A validated door - the shape [[LocksComponent]] stores. */
export interface Door extends JsonSchema {
	id: string;
	column: number;
	row: number;
	openFrame: number;
}

/** A validated chest - the shape [[LocksComponent]] stores. */
export interface Chest extends JsonSchema {
	id: string;
	column: number;
	row: number;
	openFrame: number;
	/** Catalog id of what is inside, or `""` for a bare chest. */
	reward: string;
}

function assertTile(value: unknown, where: string): number {
	if (!Number.isInteger(value) || (value as number) < 0) {
		throw new GameError(`${where} is not a tile coordinate`);
	}

	return value as number;
}

/** The checks a door and a chest share: an id nobody else has, a tile nobody else claims, an open frame. */
function parseLock<T extends DoorDocument>(lock: T, kind: string, seen: Set<string>, tiles: Set<string>): Door {
	if (typeof lock.id !== "string" || lock.id.length === 0) {
		throw new GameError(`A ${kind} is missing its id`);
	}

	if (seen.has(lock.id)) {
		throw new GameError(`Lock "${lock.id}" is defined twice`);
	}

	seen.add(lock.id);

	const column = assertTile(lock.column, `${kind} "${lock.id}" column`);
	const row = assertTile(lock.row, `${kind} "${lock.id}" row`);
	const tile = `${column},${row}`;

	if (tiles.has(tile)) {
		throw new GameError(`${kind} "${lock.id}" stands on tile ${tile}, which another lock already claims`);
	}

	tiles.add(tile);

	if (!Number.isInteger(lock.openFrame) || lock.openFrame < 0) {
		throw new GameError(`${kind} "${lock.id}" needs the frame it shows once open, got ${lock.openFrame}`);
	}

	return { id: lock.id, column, row, openFrame: lock.openFrame };
}

/**
 * Turns a parsed `*.locks.json` document into the doors and chests the locks
 * feature works with, rejecting the mistakes that would only show up as a door
 * that never opens: a lock off the tile grid, two on one tile, one with no open
 * frame to show.
 */
export function parseLocks(document: LocksDocument): { doors: Door[]; chests: Chest[] } {
	if (document.format !== "vigilans-locks") {
		throw new GameError(`Lock sheet has format "${document.format}", expected "vigilans-locks"`);
	}

	if (document.version !== 1) {
		throw new GameError(`Lock sheet has version ${document.version}, this build reads version 1`);
	}

	if (!Array.isArray(document.doors) || !Array.isArray(document.chests)) {
		throw new GameError("Lock sheet is missing its doors or its chests");
	}

	const seen = new Set<string>();
	const tiles = new Set<string>();

	const doors = document.doors.map((door) => parseLock(door, "Door", seen, tiles));
	const chests = document.chests.map((chest) => ({ ...parseLock(chest, "Chest", seen, tiles), reward: chest.reward ?? "" }));

	return { doors, chests };
}

/**
 * The notice shown after a chest is opened - Fire Emblem's "you got an item"
 * box, the same one a village gift gets. It names the unit and what it now
 * carries, and, when the pack was full, what had to go to the convoy for it.
 * A bare chest says so rather than showing an empty box.
 */
export function chestPopup(chest: Chest, unitName: string, itemId: string, storedId: string): PopupRequest {
	const lines: string[] = [];

	if (itemId.length === 0) {
		lines.push(i18n("chest.empty"));
	} else if (storedId !== itemId) {
		// The find itself went to the convoy: the unit never carried it, so saying
		// it "received" anything would be a lie. The one line covers it.
		lines.push(i18n("chest.received", { unit: unitName, item: catalogName(itemId) }));
	}

	if (storedId.length > 0) {
		lines.push(i18n("chest.stored", { item: catalogName(storedId) }));
	}

	return { id: `chest-${chest.id}`, title: i18n("chest.obtained"), lines };
}
