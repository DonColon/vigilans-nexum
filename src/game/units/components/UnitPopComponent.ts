import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";
import { PopKind } from "@/game/units/model/UnitPop";

export interface UnitPopData extends JsonSchema {
	/** Text drawn over the token - "+10" for a heal, a damage number, "Miss". */
	text: string;
	/** What the number means, which is what the renderer colours it by. */
	kind: PopKind;
	/** Milliseconds since it appeared. */
	elapsed: number;
	/** Milliseconds it lives for; `UnitPopSystem` drops the component past it. */
	duration: number;
}

/**
 * A floating label over a unit token that is not part of a battle animation -
 * the HP a healing item put back, say. `UnitPopSystem` runs its clock and takes
 * it off again when it has faded; `UnitRenderSystem` draws it in the same pass
 * as the combat pops. Absent = nothing floating over the token.
 */
export class UnitPopComponent extends Component<UnitPopData> {
	public static readonly type = "unitPop";
}
