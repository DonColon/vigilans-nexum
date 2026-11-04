import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

/**
 * The two steps of an attack: `target` moves the map cursor between the enemies
 * in reach (no panel yet), `forecast` shows the battle preview for the chosen
 * one. Confirm steps `target -> forecast -> fight`; cancel steps back.
 */
export type ForecastPhase = "target" | "forecast";

export interface ForecastData extends JsonSchema {
	/** Which step the player is on - see [[ForecastPhase]]. */
	phase: ForecastPhase;
	attackerId: string;
	/** Unit ids of every enemy the attacker can strike from here, nearest first - the targets `< >` cycles. */
	defenderIds: string[];
	/** Index into `defenderIds` of the target being previewed. */
	defenderIndex: number;
	/** Resolved current target - `defenderIds[defenderIndex]`, kept in step by ForecastSystem. */
	defenderId: string;
	/** Weapon ids the attacker can fight the current target with, in cycle order - recomputed per target. */
	weaponIds: string[];
	/** Index into `weaponIds` of the weapon being previewed. */
	weaponIndex: number;
	/** Tile the map cursor returns to if the player backs out - the attacker's tile. */
	restoreColumn: number;
	restoreRow: number;
	/** Set when the player commits to the fight; ForecastSystem reports it and pops. */
	confirmed: boolean;
	/** Set when the player backs out; ForecastSystem reports it and pops. */
	cancelled: boolean;
}

/**
 * The open attack: who is attacking, which enemies are in reach, and which
 * target / weapon is being previewed. In the `target` phase the map cursor
 * cycles the enemies (confirm picks one); in the `forecast` phase the preview
 * panel shows and `< >` cycles the weapon (confirm starts the fight). The stats
 * shown are derived fresh each frame by `ForecastRenderSystem` from the two
 * units' live state - only the choice lives here.
 */
export class ForecastComponent extends Component<ForecastData> {
	public static readonly type = "forecast";
}
