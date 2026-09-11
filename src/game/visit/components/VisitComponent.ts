import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { House } from "@/game/visit/model/Houses";

/** A house's door as it was found on the map, so it can be put back exactly as authored. */
export interface HouseDoorData extends JsonSchema {
	houseId: string;
	/** Index of the visual layer the door is drawn on. */
	layer: number;
	/** Cell of that layer, `row * columns + column`. */
	cell: number;
	/** The frame the map authored there - what the door goes back to once the house has been visited. */
	closedDoor: number;
}

export interface VisitData extends JsonSchema {
	/** Every house the scenario put on this map. */
	houses: House[];
	/** Ids of the houses that have already been called on - their doors are shut again. */
	visited: string[];
	/** Where each house's door sits in the tile map, resolved once when the map opened. */
	doors: HouseDoorData[];
}

/**
 * The map's houses and which of them have been called on. One instance, created
 * with the map from the scenario's house sheet. `VisitFeature` owns it: it opens
 * the doors of the houses still worth a knock and shuts them again as they are
 * visited.
 */
export class VisitComponent extends Component<VisitData> {
	public static readonly type = "visit";
}
