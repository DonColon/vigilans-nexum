import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";

export interface ThreatData extends JsonSchema {
	/** Ids of the enemies the overlay is showing, empty when nothing is up. */
	unitIds: string[];
	/** The overlay is the army-wide one, so it re-gathers whoever is alive rather than sticking to `unitIds`. */
	all: boolean;
	/** Tiles those enemies can walk onto, merged - a tile several of them reach is listed once. */
	movement: GridPositionData[];
	/** Tiles they could strike from somewhere they can reach, merged the same way. */
	attack: GridPositionData[];
}

/**
 * The map's single "whose range is on show" record - Radiant Dawn's enemy
 * range. One instance, created with the map and read by the threat renderer.
 * It never picks a unit up: this is a read-only look at what the other side
 * covers, so nothing here moves and nothing here is spent.
 */
export class ThreatComponent extends Component<ThreatData> {
	public static readonly type = "threat";
}

/** A fresh "nothing on show" record - fresh arrays each call, never a shared one. */
export function hiddenThreat(): ThreatData {
	return { unitIds: [], all: false, movement: [], attack: [] };
}
