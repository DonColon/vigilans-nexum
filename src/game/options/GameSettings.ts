import { AudioDevice } from "@/core/audio/AudioDevice";
import { Display } from "@/core/graphics/Display";
import { getI18n } from "@/core/i18n/I18n";
import { SwitchValue } from "@/core/options/Option";
import { OptionsService } from "@/core/options/OptionsService";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { DEFAULT_TEXT_SPEED, gameOptions, OptionId, TEXT_SPEED_DELAYS } from "@/game/options/model/GameOptions";

/**
 * This game's view of the engine's settings service: the handful of questions
 * the rest of the code actually asks, phrased in its own terms.
 *
 * The service itself is [[OptionsService]] in `@/core/options` and knows nothing
 * about any of these settings. This is where "text speed" becomes a number of
 * milliseconds and "fullscreen" becomes a thing the browser may refuse.
 */

/** Key the settings are written down under - the game's own, so two games on a host do not collide. */
export const OPTIONS_STORAGE_KEY = "vigilans-nexum.options";

/**
 * The settings service, built with this game's storage key the first time
 * anybody asks.
 *
 * Everything in game land goes through here rather than the engine's own
 * `getOptions()`, which would build one under the engine's default key - and a
 * service is built once, so whoever touched it first would decide where the
 * settings are written. Going through one accessor means no startup ordering to
 * get wrong.
 */
export function gameSettings(): OptionsService {
	if (!ServiceRegistry.has(OptionsService)) {
		new OptionsService(OPTIONS_STORAGE_KEY);
	}

	return ServiceRegistry.get(OptionsService);
}

/** What a setting is currently on. */
export function option(id: OptionId): string {
	return gameSettings().get(id);
}

/** Whether an on/off setting is on. */
export function optionEnabled(id: OptionId): boolean {
	return gameSettings().isEnabled(id);
}

/** Milliseconds the textbox waits between words - what the "text speed" setting means in practice. */
export function textRevealDelay(): number {
	return TEXT_SPEED_DELAYS[option(OptionId.TEXT_SPEED)] ?? TEXT_SPEED_DELAYS[DEFAULT_TEXT_SPEED];
}

/**
 * Builds the settings from what the game was actually built with - the languages
 * in the catalog, the channels on the audio device - and carries them all out to
 * the devices they drive. What the options feature calls once everything is up.
 *
 * A language written down last visit outranks the one the browser was detected
 * as: the player already answered that question.
 */
export function syncGameOptions(): OptionsService {
	const settings = gameSettings();
	const i18n = getI18n();

	settings.configure(gameOptions(i18n.getAvailableLocales(), audio()?.getChannelNames() ?? []));

	if (!settings.wasStored(OptionId.LANGUAGE)) {
		settings.set(OptionId.LANGUAGE, i18n.getLocale());
	}

	return settings.applyAll();
}

/**
 * Puts the fullscreen row back in step with the browser, which can leave
 * fullscreen on its own - Escape, the window chrome - without telling whoever
 * asked for it.
 */
export function adoptFullscreen(fullscreen: boolean): void {
	gameSettings().adopt(OptionId.FULLSCREEN, fullscreen ? SwitchValue.ON : SwitchValue.OFF);
}

/**
 * Whether the player wants fullscreen but is not in it - the state every visit
 * starts in when they left it switched on. A page cannot enter fullscreen on
 * load, so the want has to be carried until they touch something; see
 * [[OptionsFeature]], which does the carrying.
 */
export function wantsFullscreen(): boolean {
	return option(OptionId.FULLSCREEN) === SwitchValue.ON && display()?.isFullscreen() === false;
}

function audio(): AudioDevice | null {
	return ServiceRegistry.has(AudioDevice) ? ServiceRegistry.get<AudioDevice>(AudioDevice) : null;
}

function display(): Display | null {
	return ServiceRegistry.has(Display) ? ServiceRegistry.get<Display>(Display) : null;
}
