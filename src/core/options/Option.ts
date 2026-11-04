/**
 * What a game's settings are made of, with nothing in it about any particular
 * game: a setting is a named list of choices, a current one, and optionally
 * something to do when it changes.
 *
 * Every setting is a list rather than a free value on purpose. It means the
 * screen showing them never has to know how to edit a number or validate a
 * range, stepping through them is the same gesture everywhere, and a stored
 * value that is no longer offered can fall back to a default instead of putting
 * the game in a state nothing produces.
 *
 * Which settings exist, what they are called and what changing one *does* are
 * all the game's to say - see the `apply` hook.
 */

/** One thing a setting can be set to. */
export interface OptionChoice {
	/** Stored value - stable, never translated. */
	value: string;
	/** What the player reads. A thunk, so a screen re-labels itself when the language changes under it. */
	label: () => string;
}

export interface OptionDefinition {
	/** Id the rest of the game asks for this setting by. */
	id: string;
	/**
	 * Heading this setting is grouped under, for a screen that draws them. Free
	 * text: the engine only uses it to group, never to decide anything.
	 */
	section?: string;
	label: () => string;
	choices: OptionChoice[];
	/** Value used when nothing has been chosen, or when what was chosen is no longer offered. */
	defaultValue: string;
	/**
	 * Carries the setting out to whatever it drives - a locale, a gain node, a
	 * canvas filter. Called whenever the value changes, and once for every setting
	 * at startup (see `OptionsService.applyAll`).
	 *
	 * A setting nobody has to be *told* about needs none of this: most are read
	 * where they matter, by whoever happens to care.
	 */
	apply?: (value: string) => void;
	/**
	 * Leave this one out of `applyAll`. For a setting the platform will not accept
	 * at startup - browser fullscreen needs a user gesture behind the request and
	 * is refused without one - which something else restores at a moment it will
	 * be allowed.
	 */
	deferred?: boolean;
}

/** The values a plain on/off setting takes. Common enough to be worth naming once. */
export const SwitchValue = { ON: "on", OFF: "off" } as const;

export type SwitchValue = (typeof SwitchValue)[keyof typeof SwitchValue];

/**
 * The choice a setting is on, or its default when the stored value is not one
 * that is offered. Total: a definition that somehow has no choices at all still
 * answers with its default rather than with nothing, so a caller never has to
 * guard a setting it did not build.
 */
export function choiceOf(definition: OptionDefinition, value: string): OptionChoice {
	const chosen = definition.choices.find((choice) => choice.value === value);
	const fallback = definition.choices.find((choice) => choice.value === definition.defaultValue) ?? definition.choices[0];

	return chosen ?? fallback ?? { value: definition.defaultValue, label: () => definition.defaultValue };
}

/** The value `step` places along from the current one, wrapping around the list the way a menu does. */
export function cycleChoice(definition: OptionDefinition, value: string, step: number): string {
	if (definition.choices.length === 0) {
		return value;
	}

	const current = Math.max(
		0,
		definition.choices.findIndex((choice) => choice.value === choiceOf(definition, value).value)
	);
	const next = (current + step + definition.choices.length) % definition.choices.length;

	return definition.choices[next].value;
}

/** A list of on/off choices, labelled by the caller - the shape most switches want. */
export function switchChoices(on: () => string, off: () => string): OptionChoice[] {
	return [
		{ value: SwitchValue.ON, label: on },
		{ value: SwitchValue.OFF, label: off }
	];
}

/**
 * Choices stepping from `from` to `to` inclusive, `step` apart - what a volume
 * or a brightness row is. Stepped rather than a free slider because every
 * setting is moved the same way, and ten presses to cross a range is control
 * enough without being a chore.
 */
export function rangeChoices(from: number, to: number, step: number, label: (value: number) => string): OptionChoice[] {
	const choices: OptionChoice[] = [];

	if (step <= 0) {
		return choices;
	}

	for (let value = from; value <= to; value += step) {
		const current = value;

		choices.push({ value: String(current), label: () => label(current) });
	}

	return choices;
}
