import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { UnitFaction } from "@/game/units/components/UnitComponent";

export interface PhaseBannerData extends JsonSchema {
	/** The turn the banner announces. */
	turn: number;
	/** Whose phase is starting - picks the title and the tint. */
	faction: UnitFaction;
	/** Milliseconds the banner has been up; `PhaseBannerSystem` advances it. */
	elapsed: number;
}

/**
 * The phase announcement sweeping across the screen at the start of a turn -
 * Fire Emblem's "Player Phase". One at a time, on its own entity, created by
 * [[PhaseBannerState]]. `PhaseBannerSystem` runs the clock and takes it down
 * when it has faded; `PhaseBannerRenderSystem` reads where the clock has got to
 * and draws it that far in.
 */
export class PhaseBannerComponent extends Component<PhaseBannerData> {
	public static readonly type = "phaseBanner";
}
