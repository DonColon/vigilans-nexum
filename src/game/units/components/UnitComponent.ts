import { Component } from "@/core/ecs/Component";
import { UnitData } from "@/game/units/model/UnitData";

/**
 * A playable or hostile unit on the battle map: its resolved sheet - stats,
 * class, equipped weapon - and whether it has already moved this turn. Where it
 * stands is the shared `GridPositionComponent` on the same entity, exactly as
 * with the cursor.
 */
export class UnitComponent extends Component<UnitData> {
	public static readonly type = "unit";
}
