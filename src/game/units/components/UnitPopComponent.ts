import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

/**
 * What a floating number over a unit token means. A fight drives its own pops
 * through the battle animation; anything outside one - using an item on the
 * map, say - hangs a [[UnitPopComponent]] on the unit instead. Both end up in
 * the same draw pass, and the kind is what picks the colour, so nothing has to
 * work it out from the text.
 */
export type PopKind = (typeof PopKind)[keyof typeof PopKind];

export const PopKind = {
	/** Damage taken - the pale gold of a landed hit. */
	DAMAGE: "damage",
	/** A swing that went wide. */
	MISS: "miss",
	/** HP restored, in green. */
	HEAL: "heal"
} as const;

/** How long a floating label lives before it is gone, in milliseconds. */
export const POP_LIFETIME_MS = 560;

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

	/** A fresh pop for restored HP: 10 -> "+10", in green, for the usual lifetime. */
	public static heal(amount: number): UnitPopData {
		return { text: `+${amount}`, kind: PopKind.HEAL, elapsed: 0, duration: POP_LIFETIME_MS };
	}
}
