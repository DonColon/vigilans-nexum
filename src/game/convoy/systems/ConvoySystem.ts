import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { ConvoyComponent, ConvoyData } from "@/game/convoy/components/ConvoyComponent";
import { InventoryEntry } from "@/game/units/model/UnitData";

/**
 * Pure operations on the army's convoy, kept off the component the same way
 * `UnitSystem` keeps its lookups off the units. Nothing here mutates its
 * argument - callers write the result back through `ConvoyComponent.update`.
 *
 * The convoy has no size limit. A unit's pack does, which is the whole reason
 * the convoy exists; putting a second ceiling behind the first would only give
 * an item somewhere else to fall out of.
 */
export class ConvoySystem {
	/** The entity carrying the army's convoy, or null when no map is up. */
	public static inWorld(world: World): Entity | null {
		return world.getEntities().find((entity) => entity.hasComponent(ConvoyComponent)) ?? null;
	}

	/**
	 * Puts an entry into the convoy. It arrives the way anything handed over
	 * arrives - never readied - because nothing in the baggage train is in
	 * anybody's hands.
	 */
	public static store(data: ConvoyData, entry: InventoryEntry): ConvoyData {
		return { ...data, items: [...data.items, { ...entry, equipped: false }] };
	}

	/** How many of `itemId` the convoy is holding. */
	public static countOf(data: ConvoyData, itemId: string): number {
		return data.items.filter((entry) => entry.id === itemId).length;
	}
}
