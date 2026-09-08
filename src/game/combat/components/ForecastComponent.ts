import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface ForecastData extends JsonSchema {
	attackerId: string;
	defenderId: string;
	/** Weapon ids the attacker can fight this target with, in cycle order. */
	weaponIds: string[];
	/** Index into `weaponIds` of the weapon being previewed. */
	weaponIndex: number;
	/** Set when the player commits to the fight; ForecastSystem reports it and pops. */
	confirmed: boolean;
	/** Set when the player backs out; ForecastSystem reports it and pops. */
	cancelled: boolean;
}

/**
 * The open battle forecast: who is attacking whom and which of the attacker's
 * weapons is being previewed. The stats shown are derived fresh each frame by
 * `ForecastRenderSystem` from the two units' live state - only the choice lives
 * here.
 */
export class ForecastComponent extends Component<ForecastData> {
	public static readonly type = "forecast";
}
