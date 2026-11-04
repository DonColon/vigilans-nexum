import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";

export interface WalkData extends JsonSchema {
	/** Tiles from the unit's start to its destination, both included. */
	path: GridPositionData[];
	/** Milliseconds elapsed since the walk began. */
	elapsed: number;
	/** Milliseconds the whole walk takes. */
	duration: number;
}

/**
 * A unit that is currently walking its move path. Its `GridPositionComponent`
 * already holds the destination - this only drives the visual catch-up. The
 * renderer places the token along `path` by `elapsed / duration`; `UnitWalkSystem`
 * removes the component and announces `unit:moved` once it arrives.
 */
export class WalkComponent extends Component<WalkData> {
	public static readonly type = "walk";
}
