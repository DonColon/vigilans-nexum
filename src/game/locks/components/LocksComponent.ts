import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { Chest, Door } from "@/game/locks/model/Locks";

/** Where a lock's tile sits in the tile map, resolved once when the map opened. */
export interface LockTileData extends JsonSchema {
	lockId: string;
	/** Index of the visual layer the lock is drawn on. */
	layer: number;
	/** Cell of that layer, `row * columns + column`. */
	cell: number;
	/** The frame the map authored there - the lock as it looks shut. */
	closedFrame: number;
}

export interface LocksData extends JsonSchema {
	/** Every locked door the scenario put on this map. */
	doors: Door[];
	/** Every locked chest the scenario put on this map. */
	chests: Chest[];
	/** Ids of the doors and chests that have already been opened. */
	opened: string[];
	/** Where each lock sits in the tile map. */
	tiles: LockTileData[];
}

/**
 * The map's locked doors and chests and which of them have been opened. One
 * instance, created with the map from the scenario's lock sheet. `LocksFeature`
 * owns it: it swaps the tile when a lock is opened and strikes the lock off.
 */
export class LocksComponent extends Component<LocksData> {
	public static readonly type = "locks";
}
