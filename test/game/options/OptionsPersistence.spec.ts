import { test, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { Display } from "@/core/graphics/Display";
import { getI18n } from "@/core/i18n/I18n";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { GameStateManager } from "@/core/GameStateManager";
import { InputDevice } from "@/core/input/InputDevice";
import { World } from "@/core/ecs/World";
import { SwitchValue } from "@/core/options/Option";
import { gameOptions, OptionId } from "@/game/options/model/GameOptions";
import { clearOptions, loadOptions, saveOptions } from "@/core/options/OptionsStore";
import { OptionsFeature } from "@/game/options/OptionsFeature";
import { OptionsService } from "@/core/options/OptionsService";
import { gameSettings, OPTIONS_STORAGE_KEY, syncGameOptions } from "@/game/options/GameSettings";

/**
 * What survives a visit, and what the browser will not let survive one.
 *
 * Fullscreen is the interesting case: a page cannot enter it on load, because
 * the browser requires a real user gesture behind the request. The preference is
 * remembered anyway and carried until the player touches something.
 */
suite("Options Persistence Test Suite", () => {
	ServiceRegistry.get<World>(World.name);

	const display = new Display("options-persistence-test", { dimension: { width: 640, height: 480 } });
	new GameStateManager();
	new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	/**
	 * A service built the way the next visit builds one: its own instance, reading
	 * whatever the last one wrote down, configured with this game's settings.
	 */
	const freshService = () => new OptionsService(OPTIONS_STORAGE_KEY).configure(gameOptions(getI18n().getAvailableLocales(), ["sound", "music"]));

	let feature: OptionsFeature | null = null;

	const install = () => {
		feature = new OptionsFeature();
		feature.install();
		return feature;
	};

	beforeEach(() => {
		// The registered singleton is process-wide, so each test starts from the
		// defaults rather than from what the one before it left in memory.
		gameSettings()
			.configure(gameOptions(getI18n().getAvailableLocales(), ["sound", "music"]))
			.reset();
		clearOptions(OPTIONS_STORAGE_KEY);
	});

	afterEach(() => {
		feature?.uninstall();
		feature = null;

		vi.restoreAllMocks();
		clearOptions(OPTIONS_STORAGE_KEY);
	});

	suite("Between visits", () => {
		test("A changed setting is written down as it is changed", () => {
			const options = freshService();

			options.set(OptionId.BRIGHTNESS, "70").set(OptionId.TEXT_SPEED, "fast");

			expect(loadOptions(OPTIONS_STORAGE_KEY)).toMatchObject({ brightness: "70", textSpeed: "fast" });
		});

		test("A new visit starts on what was written down, not on the defaults", () => {
			freshService().set(OptionId.TEXT_SPEED, "instant").set(OptionId.GRID_LINES, SwitchValue.OFF);

			// A second service is what the next visit builds.
			const next = freshService();

			expect(next.get(OptionId.TEXT_SPEED)).toBe("instant");
			expect(next.isEnabled(OptionId.GRID_LINES)).toBe(false);
		});

		test("Cycling is written down too, not only setting", () => {
			const options = freshService();
			const landed = options.cycle(OptionId.TEXT_SPEED, 1);

			expect(loadOptions(OPTIONS_STORAGE_KEY).textSpeed).toBe(landed);
		});

		test("A stored value that is no longer offered falls back rather than sticking", () => {
			saveOptions(OPTIONS_STORAGE_KEY, { textSpeed: "glacial", language: "kl" });

			const options = freshService();

			expect(options.get(OptionId.TEXT_SPEED)).toBe("normal");
			expect(getI18n().getAvailableLocales()).toContain(options.get(OptionId.LANGUAGE));
		});

		test("A remembered language outranks the browser's own guess", () => {
			saveOptions(OPTIONS_STORAGE_KEY, { language: "en" });

			// The registered service is the one syncGameOptions() builds, so it has to
			// be the one that re-reads the store.
			gameSettings().reload();
			syncGameOptions();

			expect(gameSettings().get(OptionId.LANGUAGE)).toBe("en");
			expect(getI18n().getLocale()).toBe("en");
		});
	});

	suite("Fullscreen across a visit", () => {
		test("A refused request is written down as the refusal, not as what was asked for", async () => {
			freshService().set(OptionId.FULLSCREEN, SwitchValue.ON);

			// The request is answered a tick later; jsdom refuses it.
			await new Promise((resolve) => setTimeout(resolve, 0));

			// The correction has to reach the store as well as the row, or the next
			// visit carries a want the player never actually got.
			expect(loadOptions(OPTIONS_STORAGE_KEY).fullscreen).toBe(SwitchValue.OFF);
		});

		test("A remembered want is carried to the first gesture, because load is too early", () => {
			const enter = vi.spyOn(display, "enterFullscreen").mockResolvedValue(true);

			saveOptions(OPTIONS_STORAGE_KEY, { fullscreen: SwitchValue.ON });
			gameSettings().adopt(OptionId.FULLSCREEN, SwitchValue.ON);

			install();

			// Nothing yet: a page is not allowed to ask before the player has touched
			// anything, so the feature waits rather than asking and being refused.
			expect(enter).not.toHaveBeenCalled();

			document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));

			expect(enter).toHaveBeenCalledTimes(1);
		});

		test("The carried want is used once and then let go", () => {
			const enter = vi.spyOn(display, "enterFullscreen").mockResolvedValue(true);

			saveOptions(OPTIONS_STORAGE_KEY, { fullscreen: SwitchValue.ON });
			gameSettings().adopt(OptionId.FULLSCREEN, SwitchValue.ON);

			install();

			document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
			document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
			document.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(enter).toHaveBeenCalledTimes(1);
		});

		test("Nothing is carried when fullscreen was not wanted", () => {
			const enter = vi.spyOn(display, "enterFullscreen").mockResolvedValue(true);

			install();
			document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));

			expect(enter).not.toHaveBeenCalled();
		});
	});

	suite("Leaving fullscreen by the back door", () => {
		test("The row follows the browser when the player presses Escape", () => {
			const options = gameSettings();

			install();
			options.adopt(OptionId.FULLSCREEN, SwitchValue.ON);

			// What the browser does on Escape: it leaves, and tells nobody who asked.
			document.dispatchEvent(new Event("fullscreenchange"));

			expect(options.get(OptionId.FULLSCREEN)).toBe(SwitchValue.OFF);
			expect(loadOptions(OPTIONS_STORAGE_KEY).fullscreen).toBe(SwitchValue.OFF);
		});

		test("It stops following once the feature is uninstalled", () => {
			const options = gameSettings();

			install();
			feature?.uninstall();
			feature = null;

			options.adopt(OptionId.FULLSCREEN, SwitchValue.ON);
			document.dispatchEvent(new Event("fullscreenchange"));

			expect(options.get(OptionId.FULLSCREEN)).toBe(SwitchValue.ON);
		});
	});
});
