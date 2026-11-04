import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { OptionDefinition, SwitchValue, rangeChoices, switchChoices } from "@/core/options/Option";
import { OptionsService } from "@/core/options/OptionsService";
import { clearOptions, loadOptions, saveOptions } from "@/core/options/OptionsStore";

/**
 * The settings service with no game anywhere near it - which is the whole point
 * of it living in the core. It is handed a list of settings and from then on
 * only stores, validates, steps and persists them; what any of them *mean* is
 * the `apply` hook on the definition, and this knows nothing about that either.
 */
suite("Options Service Test Suite", () => {
	const KEY = "test.service.options";

	/** Records what a setting asked to be carried out to, so `apply` can be watched. */
	let applied: string[] = [];

	const switchOption = (id: string, defaultValue: string = SwitchValue.ON): OptionDefinition => ({
		id,
		section: "test",
		label: () => id,
		choices: switchChoices(
			() => "On",
			() => "Off"
		),
		defaultValue,
		apply: (value) => applied.push(`${id}=${value}`)
	});

	const rangeOption = (id: string): OptionDefinition => ({
		id,
		section: "numbers",
		label: () => id,
		choices: rangeChoices(0, 100, 25, (value) => `${value}%`),
		defaultValue: "50",
		apply: (value) => applied.push(`${id}=${value}`)
	});

	const service = (...definitions: OptionDefinition[]) => new OptionsService(KEY).configure(definitions);

	beforeEach(() => {
		applied = [];
		clearOptions(KEY);
	});

	afterEach(() => {
		clearOptions(KEY);
	});

	suite("Reading", () => {
		test("A setting starts on its default", () => {
			const options = service(switchOption("grid"), rangeOption("volume"));

			expect(options.get("grid")).toBe(SwitchValue.ON);
			expect(options.get("volume")).toBe("50");
			expect(options.getNumber("volume")).toBe(50);
			expect(options.isEnabled("grid")).toBe(true);
		});

		test("An id nothing defines reads as empty, never as enabled, and cannot be stepped", () => {
			const options = service(switchOption("grid"));

			expect(options.get("nonsense")).toBe("");
			expect(options.getNumber("nonsense")).toBe(0);
			expect(options.isEnabled("nonsense")).toBe(false);
			expect(options.cycle("nonsense", 1)).toBe("");
		});

		test("Settings can be listed whole or by heading", () => {
			const options = service(switchOption("grid"), rangeOption("volume"), switchOption("shadows"));

			expect(options.all().map((definition) => definition.id)).toStrictEqual(["grid", "volume", "shadows"]);
			expect(options.inSection("test").map((definition) => definition.id)).toStrictEqual(["grid", "shadows"]);
			expect(options.inSection("nothing")).toStrictEqual([]);
			expect(options.definitionOf("volume")?.id).toBe("volume");
			expect(options.definitionOf("nonsense")).toBeNull();
		});
	});

	suite("Changing", () => {
		test("Setting carries the value out to whatever it drives", () => {
			service(switchOption("grid")).set("grid", SwitchValue.OFF);

			expect(applied).toStrictEqual(["grid=off"]);
		});

		test("A value the setting does not offer is ignored, and nothing is carried out", () => {
			const options = service(switchOption("grid"));

			options.set("grid", "maybe");

			expect(options.get("grid")).toBe(SwitchValue.ON);
			expect(applied).toStrictEqual([]);
		});

		test("Stepping wraps around and carries out what it lands on", () => {
			const options = service(rangeOption("volume"));

			expect(options.cycle("volume", 1)).toBe("75");
			expect(options.cycle("volume", 2)).toBe("0"); // past the end, round to the start
			expect(applied).toStrictEqual(["volume=75", "volume=0"]);
		});

		test("Adopting takes a value without carrying it back out", () => {
			const options = service(switchOption("grid"));

			// What a setting does when the *device* reports a change - pushing it back
			// would be telling the device what it just told us.
			options.adopt("grid", SwitchValue.OFF);

			expect(options.get("grid")).toBe(SwitchValue.OFF);
			expect(applied).toStrictEqual([]);
			expect(loadOptions(KEY).grid).toBe(SwitchValue.OFF);
		});
	});

	suite("Carrying every setting out", () => {
		test("applyAll pushes each one at what it is currently on", () => {
			const options = service(switchOption("grid"), rangeOption("volume"));

			options.applyAll();

			expect(applied).toStrictEqual(["grid=on", "volume=50"]);
		});

		test("A deferred setting is left out - the platform will not take it this early", () => {
			const options = service({ ...switchOption("fullscreen"), deferred: true }, switchOption("grid"));

			options.applyAll();

			expect(applied).toStrictEqual(["grid=on"]);
		});

		test("A setting with nothing to apply is simply skipped", () => {
			const options = service({
				id: "quiet",
				label: () => "quiet",
				choices: switchChoices(
					() => "On",
					() => "Off"
				),
				defaultValue: SwitchValue.ON
			});

			expect(() => options.applyAll()).not.toThrow();
			expect(applied).toStrictEqual([]);
		});
	});

	suite("Across visits", () => {
		test("What was set is what the next service reads", () => {
			service(switchOption("grid")).set("grid", SwitchValue.OFF);

			expect(service(switchOption("grid")).get("grid")).toBe(SwitchValue.OFF);
		});

		test("A stored value the settings no longer offer falls back to the default", () => {
			saveOptions(KEY, { grid: "perhaps" });

			expect(service(switchOption("grid")).get("grid")).toBe(SwitchValue.ON);
		});

		test("A remembered choice can be told from a default", () => {
			saveOptions(KEY, { grid: SwitchValue.OFF });

			const options = service(switchOption("grid"), rangeOption("volume"));

			expect(options.wasStored("grid")).toBe(true);
			expect(options.wasStored("volume")).toBe(false);
		});

		test("Reloading re-reads the store into a service already running", () => {
			const options = service(switchOption("grid"));
			expect(options.get("grid")).toBe(SwitchValue.ON);

			saveOptions(KEY, { grid: SwitchValue.OFF });
			options.reload();

			expect(options.get("grid")).toBe(SwitchValue.OFF);
			expect(options.wasStored("grid")).toBe(true);
		});

		test("Re-configuring keeps values the new list still offers and drops the rest", () => {
			const options = service(switchOption("grid"), rangeOption("volume"));
			options.set("volume", "100");

			// A game rebuilding its settings once it knows what it was built with.
			options.configure([switchOption("grid"), rangeOption("volume"), switchOption("shadows")]);

			expect(options.get("volume")).toBe("100");
			expect(options.get("shadows")).toBe(SwitchValue.ON);
		});
	});

	suite("Resetting", () => {
		test("Everything goes back to its default, is forgotten, and is carried back out", () => {
			const options = service(switchOption("grid"), rangeOption("volume"));
			options.set("grid", SwitchValue.OFF).set("volume", "0");

			applied = [];
			options.reset();

			expect(options.get("grid")).toBe(SwitchValue.ON);
			expect(options.get("volume")).toBe("50");
			expect(loadOptions(KEY)).toStrictEqual({});
			expect(applied).toStrictEqual(["grid=on", "volume=50"]);
		});
	});

	suite("Its own storage key", () => {
		test("Two services under different keys do not read each other's settings", () => {
			new OptionsService("test.one").configure([switchOption("grid")]).set("grid", SwitchValue.OFF);

			const other = new OptionsService("test.two").configure([switchOption("grid")]);

			expect(other.get("grid")).toBe(SwitchValue.ON);

			clearOptions("test.one");
			clearOptions("test.two");
		});
	});
});
