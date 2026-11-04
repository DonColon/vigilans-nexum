/**
 * The Base tier's mastery abilities, all of them movement tools - see
 * `design/catalog/Abilities.md`, *Mastery Abilities → Base - positional*. A
 * unit sheet lists the ones its character has learned under `abilities`; this
 * is the vocabulary that list is read against. An id the sheet carries that is
 * not here belongs to another feature (or to none yet) and is left alone.
 *
 * The ids double as the rows of the unit command menu, so a chosen row names
 * the ability outright.
 */
export type PositionalAbility = (typeof PositionalAbility)[keyof typeof PositionalAbility];

export const PositionalAbility = {
	/** Trade places with an adjacent ally. */
	SWAP: "swap",
	/** Push an adjacent unit - ally or enemy - one tile directly away; an enemy only when its Strength is not above this unit's. */
	SHOVE: "shove",
	/** Pull an adjacent ally to the tile directly behind this unit. */
	REPOSITION: "reposition",
	/** Push an adjacent unit - ally or enemy - two tiles directly away; an enemy only when its Strength is not above this unit's. */
	KNOCKBACK: "knockback",
	/** Step one tile away from an adjacent ally and bring the ally into the tile this unit left. */
	DRAW_BACK: "draw-back",
	/** Pull an ally two tiles off to the tile beside this unit. */
	MYSTIC_PULL: "mystic-pull"
} as const;

/** Every positional ability, in the order the command menu lists them. */
export const POSITIONAL_ABILITIES: readonly PositionalAbility[] = [
	PositionalAbility.SWAP,
	PositionalAbility.SHOVE,
	PositionalAbility.REPOSITION,
	PositionalAbility.KNOCKBACK,
	PositionalAbility.DRAW_BACK,
	PositionalAbility.MYSTIC_PULL
];

const abilityValues = new Set<string>(POSITIONAL_ABILITIES);

/** Whether an id off a sheet - or a menu row - is one of the six. */
export function isPositionalAbility(value: unknown): value is PositionalAbility {
	return typeof value === "string" && abilityValues.has(value);
}
