import { test, expect, suite } from "vitest";
import { i18n } from "@/core/i18n/I18n";
import { MAX_BRIGHTNESS, MIN_BRIGHTNESS } from "@/core/graphics/Display";
import { choiceOf, cycleChoice, OptionDefinition, SwitchValue } from "@/core/options/Option";
import { channelVolumeId, DEFAULT_VOLUME, gameOptions, localeName, OptionId, OptionSection, TEXT_SPEED_DELAYS, volumeChannelOf } from "@/game/options/model/GameOptions";
import { optionsHeight, optionsPanel, OPTIONS_WIDTH } from "@/game/options/model/OptionsScreen";
import { UITheme } from "@/game/ui/model/UITheme";

/** The vocabulary of the settings screen: what is settable, to what, and how the panel is sized around it. */
suite("Game Options Test Suite", () => {
	const options = (locales: string[] = ["de", "en"], channels: string[] = []) => gameOptions(locales, channels);
	const byId = (id: OptionId, locales?: string[]) => options(locales).find((definition) => definition.id === id) as OptionDefinition;

	suite("The settings", () => {
		test("The settings are grouped, and each group is listed together", () => {
			const sections = options().map((definition) => definition.section);

			// Every heading appears as one unbroken run, so the screen never has to
			// draw the same one twice.
			expect(new Set(sections).size).toBe(new Set(sections).size);
			expect([...new Set(sections)]).toStrictEqual([OptionSection.GAME, OptionSection.GRAPHICS, OptionSection.AUDIO]);
			expect(sections).toStrictEqual([...sections].sort((a, b) => [...new Set(sections)].indexOf(a) - [...new Set(sections)].indexOf(b)));
		});

		test("Language comes first, because it changes what the rest of the screen says", () => {
			expect(options()[0].id).toBe(OptionId.LANGUAGE);
		});

		test("Graphics and audio each carry what they should", () => {
			const idsIn = (section: OptionSection) =>
				options(["de", "en"], ["sound", "music"])
					.filter((definition) => definition.section === section)
					.map((definition) => definition.id);

			expect(idsIn(OptionSection.GAME)).toStrictEqual([OptionId.LANGUAGE, OptionId.TEXT_SPEED, OptionId.BATTLE_ANIMATIONS]);
			expect(idsIn(OptionSection.GRAPHICS)).toStrictEqual([OptionId.FULLSCREEN, OptionId.BRIGHTNESS, OptionId.GRID_LINES]);
			expect(idsIn(OptionSection.AUDIO)).toStrictEqual([OptionId.MASTER_VOLUME, channelVolumeId("sound"), channelVolumeId("music")]);
		});

		test("A volume row is offered per channel the device was built with, and none when there are none", () => {
			expect(options(["en"], []).filter((definition) => volumeChannelOf(definition.id) !== null)).toStrictEqual([]);
			expect(options(["en"], ["sound", "music", "voice"]).filter((definition) => volumeChannelOf(definition.id) !== null)).toHaveLength(3);
		});

		test("A volume setting names its own channel, and nothing else does", () => {
			expect(channelVolumeId("music")).toBe("volume.music");
			expect(volumeChannelOf(channelVolumeId("music"))).toBe("music");
			expect(volumeChannelOf(OptionId.MASTER_VOLUME)).toBeNull();
			expect(volumeChannelOf(OptionId.BRIGHTNESS)).toBeNull();
		});

		test("Volume runs silence to full in tenths, and zero reads as off rather than 0%", () => {
			const master = byId(OptionId.MASTER_VOLUME);

			expect(master.choices.map((choice) => choice.value)).toStrictEqual(["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"]);
			expect(master.choices[0].label()).toBe(i18n("options.off"));
			expect(master.choices[10].label()).toBe("100%");
			expect(master.defaultValue).toBe(DEFAULT_VOLUME);
		});

		test("Brightness stays inside what the display will accept", () => {
			const brightness = byId(OptionId.BRIGHTNESS).choices.map((choice) => Number(choice.value));

			expect(Math.min(...brightness)).toBe(MIN_BRIGHTNESS);
			expect(Math.max(...brightness)).toBe(MAX_BRIGHTNESS);
			expect(byId(OptionId.BRIGHTNESS).defaultValue).toBe("100"); // the display untouched
		});

		test("Fullscreen is off by default - the browser has to be asked, not assumed", () => {
			expect(byId(OptionId.FULLSCREEN).defaultValue).toBe(SwitchValue.OFF);
		});

		test("Every setting has a translated name and at least two things to be", () => {
			for (const definition of options()) {
				expect(definition.label().length, definition.id).toBeGreaterThan(0);
				expect(definition.label(), definition.id).not.toContain("options.");
				expect(definition.choices.length, definition.id).toBeGreaterThanOrEqual(2);

				for (const choice of definition.choices) {
					expect(choice.label().length, `${definition.id}/${choice.value}`).toBeGreaterThan(0);
				}
			}
		});

		test("Every setting defaults to one of its own choices", () => {
			for (const definition of options()) {
				expect(
					definition.choices.map((choice) => choice.value),
					definition.id
				).toContain(definition.defaultValue);
			}
		});

		test("Languages are offered in their own name, not a translated one", () => {
			const language = byId(OptionId.LANGUAGE);

			expect(language.choices.map((choice) => choice.value)).toStrictEqual(["de", "en"]);
			// Whatever the game is set to, German reads as German.
			expect(language.choices[0].label()).toBe(localeName("de"));
			expect(localeName("de")).toBe("Deutsch");
			expect(localeName("en")).toBe("English");
		});

		test("A language code the browser cannot name falls back to the code", () => {
			expect(localeName("zz-not-a-language")).toBe("zz-not-a-language");
		});

		test("With no catalog loaded the language setting still offers something", () => {
			const language = byId(OptionId.LANGUAGE, []);

			// A setting with nothing to choose from is not a setting - and the options
			// can be built before any catalog has landed.
			expect(language.choices.length).toBeGreaterThan(0);
			expect(language.choices.map((choice) => choice.value)).toContain(language.defaultValue);
		});

		test("Text speed runs from slow to instant, and instant means no wait at all", () => {
			expect(byId(OptionId.TEXT_SPEED).choices.map((choice) => choice.value)).toStrictEqual(["slow", "normal", "fast", "instant"]);
			expect(TEXT_SPEED_DELAYS.slow).toBeGreaterThan(TEXT_SPEED_DELAYS.normal);
			expect(TEXT_SPEED_DELAYS.normal).toBeGreaterThan(TEXT_SPEED_DELAYS.fast);
			expect(TEXT_SPEED_DELAYS.instant).toBe(0);
		});

		test("The two switches are on by default - the game as it was before any of this", () => {
			for (const id of [OptionId.BATTLE_ANIMATIONS, OptionId.GRID_LINES]) {
				expect(byId(id).defaultValue, id).toBe(SwitchValue.ON);
				expect(
					byId(id).choices.map((choice) => choice.value),
					id
				).toStrictEqual([SwitchValue.ON, SwitchValue.OFF]);
			}
		});

		test("Labels are resolved fresh, so a switch of language relabels them", () => {
			const definition = byId(OptionId.GRID_LINES);

			expect(definition.label()).toBe(i18n("options.gridLines"));
			expect(definition.choices[0].label()).toBe(i18n("options.on"));
		});
	});

	suite("Reading and stepping a setting", () => {
		test("A stored value that is offered is the one that is read back", () => {
			expect(choiceOf(byId(OptionId.TEXT_SPEED), "fast").value).toBe("fast");
		});

		test("A value no longer offered falls back to the default rather than sticking", () => {
			expect(choiceOf(byId(OptionId.TEXT_SPEED), "glacial").value).toBe("normal");
			expect(choiceOf(byId(OptionId.LANGUAGE), "fr").value).toBe("de");
		});

		test("A definition with no choices at all still answers with its default", () => {
			const empty: OptionDefinition = { id: OptionId.GRID_LINES, section: OptionSection.GRAPHICS, label: () => "", choices: [], defaultValue: SwitchValue.ON };

			expect(choiceOf(empty, "anything").value).toBe(SwitchValue.ON);
			expect(choiceOf(empty, "anything").label()).toBe(SwitchValue.ON);
		});

		test("Stepping wraps around the choices in both directions", () => {
			const speed = byId(OptionId.TEXT_SPEED);

			expect(cycleChoice(speed, "slow", 1)).toBe("normal");
			expect(cycleChoice(speed, "instant", 1)).toBe("slow"); // past the end
			expect(cycleChoice(speed, "slow", -1)).toBe("instant"); // before the start
		});

		test("Stepping from a value that is not offered starts from the default", () => {
			expect(cycleChoice(byId(OptionId.TEXT_SPEED), "glacial", 1)).toBe("fast"); // normal -> fast
		});

		test("Stepping a setting with no choices leaves it alone", () => {
			const empty: OptionDefinition = { id: OptionId.GRID_LINES, section: OptionSection.GRAPHICS, label: () => "", choices: [], defaultValue: SwitchValue.ON };

			expect(cycleChoice(empty, "on", 1)).toBe("on");
		});
	});

	suite("Layout", () => {
		test("The panel is as tall as its rows and no wider than the cap", () => {
			const panel = optionsPanel({ width: 1536, height: 768 }, 4);

			expect(panel.getWidth()).toBe(OPTIONS_WIDTH);
			expect(panel.getHeight()).toBe(optionsHeight(4));
			expect(optionsHeight(5) - optionsHeight(4)).toBe(UITheme.lineHeight);
		});

		test("Each heading costs a line of its own", () => {
			expect(optionsHeight(7, 3) - optionsHeight(7, 0)).toBe(3 * UITheme.lineHeight);
		});

		test("A panel taller than the screen is capped rather than hanging off it", () => {
			const panel = optionsPanel({ width: 1536, height: 400 }, 20, 3);

			expect(panel.getHeight()).toBeLessThanOrEqual(400);
			expect(panel.getPosition().y).toBeGreaterThanOrEqual(0);
		});

		test("It is centred, and narrows rather than running off a small screen", () => {
			const wide = optionsPanel({ width: 1536, height: 768 }, 4);
			expect(wide.getPosition().x).toBe(Math.round((1536 - OPTIONS_WIDTH) / 2));

			const narrow = optionsPanel({ width: 500, height: 400 }, 4);
			expect(narrow.getWidth()).toBeLessThan(OPTIONS_WIDTH);
			expect(narrow.getPosition().x).toBeGreaterThanOrEqual(0);
			expect(narrow.getPosition().x + narrow.getWidth()).toBeLessThanOrEqual(500);
		});

		test("A screen with nothing on it still gets a row to say so in", () => {
			expect(optionsHeight(0)).toBe(optionsHeight(1));
		});
	});
});
