import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { PopKind } from "@/game/units/model/UnitPop";

export interface CombatAnimationData extends JsonSchema {
	/** Fractional tile offset added to the token position while it swings / recoils. */
	offsetColumn: number;
	offsetRow: number;
	/** 0-1 white flash over the token on a hit. */
	flash: number;
	/** 0-1 expanding ring on a critical. */
	critFlash: number;
	/** HP the bar should show (drains during the animation). */
	hp: number;
	/** 0-1 token opacity, for a death fade. */
	alpha: number;
	/** Floating combat text over the token - "" when none, else "Miss" or the damage number. */
	popText: string;
	/** What that text means, which is what it is coloured by. Meaningless while `popText` is empty. */
	popKind: PopKind;
	/** 0-1 through the floating text's lifetime; the renderer rises and fades it by this. */
	popAge: number;
}

/**
 * Transient token overrides while a fight animates - a lunge offset, a hit
 * flash, a draining HP value, a fade-out. `BattleAnimationSystem` adds it to the
 * two combatants for the length of the animation; `UnitRenderSystem` layers it
 * over the normal token draw. Absent = the token renders straight from its
 * sheet.
 */
export class CombatAnimationComponent extends Component<CombatAnimationData> {
	public static readonly type = "combatAnimation";
}
