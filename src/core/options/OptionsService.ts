import { GameCoreService } from "@/core/service/GameCoreService";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { choiceOf, cycleChoice, OptionDefinition, SwitchValue } from "@/core/options/Option";
import { clearOptions, loadOptions, saveOptions, StoredOptions } from "@/core/options/OptionsStore";

/** Key the settings are written down under when a game does not name its own. */
export const DEFAULT_OPTIONS_KEY = "options";

/**
 * The active settings, and the one place anything asks for them.
 *
 * A `GameCoreService`, for the same reason [[I18nService]] is one: a setting is
 * read by whoever it happens to affect - a render system, a textbox pacing
 * itself, a feature deciding whether to play an animation - and none of those
 * have any business reaching into whatever screen the player changed it on.
 * Inject it with `@GameCoreService(OptionsService)`, or reach it from a plain
 * module with {@link getOptions}.
 *
 * It knows nothing about *which* settings a game has. It is handed a list of
 * [[OptionDefinition]]s and from then on only stores, validates, steps and
 * persists them; what a setting means is the `apply` hook on its own definition.
 *
 * Values are written down as they change and read back on the next visit - see
 * [[OptionsStore]] for why that is `localStorage`.
 */
@GameCoreService()
export class OptionsService {
	private values = new Map<string, string>();
	private definitions: OptionDefinition[] = [];

	/** Ids that came back off the store, so a remembered choice can be told from a default. */
	private stored = new Set<string>();

	constructor(private readonly storageKey: string = DEFAULT_OPTIONS_KEY) {
		const written = loadOptions(this.storageKey);

		this.values = new Map(Object.entries(written));
		this.stored = new Set(Object.keys(written));
	}

	/**
	 * Takes the list of settings this game has. Any value already held - read off
	 * the store, or set before the list was known - is kept when the new list
	 * still offers it, and dropped when it does not.
	 *
	 * Safe to call again: a game whose settings depend on what it was built with
	 * (the languages in its catalog, the channels on its audio device) rebuilds
	 * them once those are up.
	 */
	public configure(definitions: readonly OptionDefinition[]): this {
		this.definitions = [...definitions];

		for (const definition of this.definitions) {
			this.values.set(definition.id, choiceOf(definition, this.values.get(definition.id) ?? definition.defaultValue).value);
		}

		return this;
	}

	/**
	 * Re-reads what is written down, keeping only values the current settings
	 * still offer. What a fresh visit does when it is built; useful on its own
	 * where the store has changed underneath a service that is already running.
	 */
	public reload(): this {
		const written = loadOptions(this.storageKey);

		this.values = new Map(Object.entries(written));
		this.stored = new Set(Object.keys(written));

		return this.configure(this.definitions);
	}

	/** Every setting, in the order it was configured. */
	public all(): OptionDefinition[] {
		return [...this.definitions];
	}

	/** Every setting under one heading, in that same order. */
	public inSection(section: string): OptionDefinition[] {
		return this.definitions.filter((definition) => definition.section === section);
	}

	public definitionOf(id: string): OptionDefinition | null {
		return this.definitions.find((definition) => definition.id === id) ?? null;
	}

	/** What a setting is currently on. An id nothing defines reads as an empty string. */
	public get(id: string): string {
		const definition = this.definitionOf(id);

		return definition === null ? "" : choiceOf(definition, this.values.get(id) ?? definition.defaultValue).value;
	}

	/** A setting read back as a number - what a volume or a brightness row stores. */
	public getNumber(id: string): number {
		const value = Number(this.get(id));

		return Number.isFinite(value) ? value : 0;
	}

	/** Whether an on/off setting is on. A setting that is not a switch is never "on". */
	public isEnabled(id: string): boolean {
		return this.get(id) === SwitchValue.ON;
	}

	/** Whether this setting was read back off the store rather than left at its default. */
	public wasStored(id: string): boolean {
		return this.stored.has(id);
	}

	/** Sets a setting, ignoring a value it does not offer. Applies it and writes it down. */
	public set(id: string, value: string): this {
		if (!this.offers(id, value)) {
			return this;
		}

		this.values.set(id, value);
		this.definitionOf(id)?.apply?.(value);

		return this.save();
	}

	/**
	 * Takes a value reported by whatever the setting drives, *without* pushing it
	 * back out again - what a fullscreen row does when the player leaves with
	 * Escape and the browser tells nobody who asked. Writing it down still
	 * matters: it is what they chose, however they chose it.
	 */
	public adopt(id: string, value: string): this {
		if (!this.offers(id, value)) {
			return this;
		}

		this.values.set(id, value);

		return this.save();
	}

	/** Steps a setting `step` places along its choices, wrapping around. Returns what it landed on. */
	public cycle(id: string, step: number): string {
		const definition = this.definitionOf(id);

		if (definition === null) {
			return "";
		}

		const next = cycleChoice(definition, this.get(id), step);

		this.values.set(id, next);
		definition.apply?.(next);
		this.save();

		return next;
	}

	/**
	 * Carries every setting out to whatever it drives - for devices that have only
	 * just been built, at startup.
	 *
	 * A `deferred` setting is left out: it is one the platform will not accept
	 * this early, and something else restores it when it will.
	 */
	public applyAll(): this {
		for (const definition of this.definitions) {
			if (!definition.deferred) {
				definition.apply?.(this.get(definition.id));
			}
		}

		return this;
	}

	/** Writes every setting down, so the next visit starts where this one left off. */
	public save(): this {
		const stored: StoredOptions = {};

		for (const definition of this.definitions) {
			stored[definition.id] = this.get(definition.id);
		}

		saveOptions(this.storageKey, stored);

		return this;
	}

	/**
	 * Puts every setting back to its default and forgets what was written down -
	 * what a "restore defaults" row does, and what a test needs between cases.
	 */
	public reset(): this {
		this.values.clear();
		this.stored.clear();

		for (const definition of this.definitions) {
			this.values.set(definition.id, definition.defaultValue);
		}

		clearOptions(this.storageKey);

		return this.applyAll();
	}

	/** Whether this setting exists and offers this value - what set and adopt both turn on. */
	private offers(id: string, value: string): boolean {
		return this.definitionOf(id)?.choices.some((choice) => choice.value === value) ?? false;
	}
}

/**
 * The registered service, built on first use - so reading a setting from a plain
 * module works with zero setup, the same way `i18n()` does. A game configures it
 * with its own settings once it knows what they are.
 */
export function getOptions(): OptionsService {
	if (!ServiceRegistry.has(OptionsService)) {
		new OptionsService();
	}

	return ServiceRegistry.get(OptionsService);
}
