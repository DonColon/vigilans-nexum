import { AudioDevice } from "@/core/audio/AudioDevice";
import { Display, MAX_BRIGHTNESS, MIN_BRIGHTNESS } from "@/core/graphics/Display";
import { DEFAULT_LOCALE, getI18n, i18n } from "@/core/i18n/I18n";
import { OptionChoice, OptionDefinition, rangeChoices, switchChoices, SwitchValue } from "@/core/options/Option";
import { adoptFullscreen } from "@/game/options/GameSettings";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";

/**
 * The settings *this* game has, and what each one actually does.
 *
 * The machinery behind them - storing, validating, stepping, persisting - is the
 * engine's and lives in `@/core/options`. What belongs here is only the
 * catalogue: which settings exist, what they are called, what they may be set
 * to, and the `apply` that carries each one out to the thing it drives.
 *
 * A setting with no `apply` is one nobody has to be told about: the grid
 * renderer asks whether to draw its lines, the textbox asks how fast to reveal.
 * Only the ones that live on a device - the locale, a gain node, the canvas -
 * need pushing.
 */

/** Ids the rest of the game asks for a setting by. */
export const OptionId = {
	LANGUAGE: "language",
	TEXT_SPEED: "textSpeed",
	BATTLE_ANIMATIONS: "battleAnimations",
	GRID_LINES: "gridLines",
	FULLSCREEN: "fullscreen",
	BRIGHTNESS: "brightness",
	MASTER_VOLUME: "masterVolume"
} as const;

export type OptionId = (typeof OptionId)[keyof typeof OptionId];

/** The headings the screen groups its rows under. */
export const OptionSection = {
	GAME: "game",
	GRAPHICS: "graphics",
	AUDIO: "audio"
} as const;

export type OptionSection = (typeof OptionSection)[keyof typeof OptionSection];

/**
 * A per-channel volume setting is named after its channel, so the audio device
 * decides how many there are rather than this module guessing. `sound` becomes
 * `volume.sound`.
 */
export function channelVolumeId(channel: string): OptionId {
	return `volume.${channel}` as OptionId;
}

/** The channel a per-channel volume setting belongs to, or null for any other setting. */
export function volumeChannelOf(id: string): string | null {
	return id.startsWith("volume.") ? id.slice("volume.".length) : null;
}

/**
 * How long the textbox waits between words, by setting. "Instant" is zero - the
 * whole page is there the moment it opens, which is what a player who has read
 * the script before wants.
 */
export const TEXT_SPEED_DELAYS: Record<string, number> = {
	slow: 90,
	normal: 45,
	fast: 20,
	instant: 0
};

/** The default word delay - the one the textbox had before any of this was settable. */
export const DEFAULT_TEXT_SPEED = "normal";

/** Volume runs 0 to 100 in tenths. */
export const VOLUME_STEP = 10;

/** Loud enough to hear, quiet enough not to be a surprise on first launch. */
export const DEFAULT_VOLUME = "80";

/** The brightness the screen ships at - the display untouched. */
export const DEFAULT_BRIGHTNESS = "100";

/** The devices are looked up rather than injected, and tolerated missing - a headless run has neither. */
function audio(): AudioDevice | null {
	return ServiceRegistry.has(AudioDevice) ? ServiceRegistry.get<AudioDevice>(AudioDevice) : null;
}

function display(): Display | null {
	return ServiceRegistry.has(Display) ? ServiceRegistry.get<Display>(Display) : null;
}

function onOff(): OptionChoice[] {
	return switchChoices(
		() => i18n("options.on"),
		() => i18n("options.off")
	);
}

function volumeChoices(): OptionChoice[] {
	return rangeChoices(0, 100, VOLUME_STEP, (value) => (value === 0 ? i18n("options.off") : `${value}%`));
}

/**
 * Asks the browser for fullscreen and puts the row back if it says no.
 *
 * The browser can refuse - `requestFullscreen` needs a real user gesture behind
 * it - so the setting is a request, not a guarantee. The correction goes through
 * `adopt` so it reaches the store as well as the row: a refusal written down as
 * success would have the next visit carrying a want the player never got.
 */
function applyFullscreen(wanted: boolean): void {
	const screen = display();

	if (screen === null) {
		return;
	}

	const request = wanted ? screen.enterFullscreen() : screen.exitFullscreen();

	void request.then((succeeded) => {
		if (!succeeded) {
			adoptFullscreen(!wanted);
		}
	});
}

/**
 * Every setting, in the order the screen lists them. Language first: it is the
 * one that changes what the rest of the screen says, so it belongs where the eye
 * lands.
 *
 * `locales` and `channels` are what the game was actually built with - the
 * catalog's languages and the audio device's channels - passed in because those
 * are the I18nService's and the AudioDevice's to know, not this module's.
 */
export function gameOptions(locales: readonly string[] = [], channels: readonly string[] = []): OptionDefinition[] {
	// Never empty: a setting with nothing to choose from is not a setting, and the
	// options can be built before a catalog has been loaded at all.
	const available = locales.length > 0 ? [...locales] : [DEFAULT_LOCALE];

	return [
		{
			id: OptionId.LANGUAGE,
			section: OptionSection.GAME,
			label: () => i18n("options.language"),
			// Each language in its own name: someone looking for theirs is looking for
			// the word they would write it with.
			choices: available.map((locale) => ({ value: locale, label: () => localeName(locale) })),
			defaultValue: available[0],
			apply: (value) => void getI18n().setLocale(value)
		},
		{
			id: OptionId.TEXT_SPEED,
			section: OptionSection.GAME,
			label: () => i18n("options.textSpeed"),
			choices: Object.keys(TEXT_SPEED_DELAYS).map((value) => ({ value, label: () => i18n(`options.textSpeed.${value}`) })),
			defaultValue: DEFAULT_TEXT_SPEED
		},
		{
			id: OptionId.BATTLE_ANIMATIONS,
			section: OptionSection.GAME,
			label: () => i18n("options.battleAnimations"),
			choices: onOff(),
			defaultValue: SwitchValue.ON
		},
		{
			id: OptionId.FULLSCREEN,
			section: OptionSection.GRAPHICS,
			label: () => i18n("options.fullscreen"),
			choices: onOff(),
			defaultValue: SwitchValue.OFF,
			apply: (value) => applyFullscreen(value === SwitchValue.ON),
			// A page cannot enter fullscreen at startup - the browser wants a gesture
			// behind the request and refuses without one, and the refusal would switch
			// the player's remembered preference off. OptionsFeature restores it on the
			// first gesture instead.
			deferred: true
		},
		{
			id: OptionId.BRIGHTNESS,
			section: OptionSection.GRAPHICS,
			label: () => i18n("options.brightness"),
			choices: rangeChoices(MIN_BRIGHTNESS, MAX_BRIGHTNESS, 10, (value) => `${value}%`),
			defaultValue: DEFAULT_BRIGHTNESS,
			apply: (value) => void display()?.setBrightness(Number(value))
		},
		{
			id: OptionId.GRID_LINES,
			section: OptionSection.GRAPHICS,
			label: () => i18n("options.gridLines"),
			choices: onOff(),
			defaultValue: SwitchValue.ON
		},
		{
			id: OptionId.MASTER_VOLUME,
			section: OptionSection.AUDIO,
			label: () => i18n("options.masterVolume"),
			choices: volumeChoices(),
			defaultValue: DEFAULT_VOLUME,
			apply: (value) => audio()?.volume(Number(value))
		},
		// One row per channel the audio device was actually built with, so a new
		// channel in the game config shows up here without a change to this list.
		...channels.map((channel) => ({
			id: channelVolumeId(channel),
			section: OptionSection.AUDIO,
			label: () => i18n(`options.volume.${channel}`),
			choices: volumeChoices(),
			defaultValue: DEFAULT_VOLUME,
			apply: (value: string) => audio()?.volume(Number(value), channel)
		}))
	];
}

/**
 * A language in its own name. `Intl.DisplayNames` knows them all and is asked in
 * the language it is naming, so German reads "Deutsch" whatever the game is set
 * to; the code itself is the fallback where the browser has no answer.
 */
export function localeName(locale: string): string {
	try {
		return new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
	} catch {
		return locale;
	}
}
