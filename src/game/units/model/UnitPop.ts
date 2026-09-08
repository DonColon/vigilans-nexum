/**
 * The floating numbers that pop over a unit token: the damage of a strike, a
 * "Miss", the HP a vulnerary put back. A fight drives its own through the
 * battle animation; anything outside one - using an item on the map, say -
 * hangs a [[UnitPopComponent]] on the unit instead. Both end up in the same
 * draw pass, and the kind is what picks the colour, so nothing has to work it
 * out from the text.
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

/** The label for restored HP: 10 -> "+10". */
export function healPopText(amount: number): string {
	return `+${amount}`;
}
