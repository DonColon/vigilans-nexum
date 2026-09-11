import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { InventoryEntry } from "@/game/units/model/UnitData";

export interface ConvoyData extends JsonSchema {
	/** Everything the baggage train is carrying, in the order it arrived. */
	items: InventoryEntry[];
}

/**
 * The army's convoy - Fire Emblem's supply train. One instance, created with the
 * map, shared by every unit on the player's side: what a unit is handed when its
 * own pack is full goes here rather than being lost.
 *
 * Entries are ordinary [[InventoryEntry]] records, the same shape a pack holds,
 * so anything that comes back out of the convoy can go straight into one.
 */
export class ConvoyComponent extends Component<ConvoyData> {
	public static readonly type = "convoy";
}
