import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { InventoryEntry } from "@/game/units/components/UnitComponent";

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
 *
 * The convoy has no size limit. A unit's pack does, which is the whole reason
 * the convoy exists; putting a second ceiling behind the first would only give
 * an item somewhere else to fall out of.
 */
export class ConvoyComponent extends Component<ConvoyData> {
	public static readonly type = "convoy";

	/**
	 * The convoy with `entry` put in. It arrives the way anything handed over
	 * arrives - never readied - because nothing in the baggage train is in
	 * anybody's hands. Pure: `data` is left alone and the new convoy comes back.
	 */
	public static store(data: ConvoyData, entry: InventoryEntry): ConvoyData {
		return { ...data, items: [...data.items, { ...entry, equipped: false }] };
	}

	/** How many of `itemId` the convoy is holding. */
	public static countOf(data: ConvoyData, itemId: string): number {
		return data.items.filter((entry) => entry.id === itemId).length;
	}

	/** Puts `entry` into this convoy - the live component taking the handover itself. */
	public store(entry: InventoryEntry): void {
		this.update(ConvoyComponent.store(this.read(), entry));
	}
}
