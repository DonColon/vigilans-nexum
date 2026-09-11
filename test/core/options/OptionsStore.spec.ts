import { test, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { clearOptions, loadOptions, saveOptions } from "@/core/options/OptionsStore";

/**
 * Where the settings are written down between visits. It has to tolerate a
 * browser that will not store anything - private mode, site data switched off -
 * because settings that cannot be saved are not worth a crash.
 */
suite("Options Store Test Suite", () => {
	const KEY = "test.options";

	beforeEach(() => {
		clearOptions(KEY);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		clearOptions(KEY);
	});

	test("What was written down comes back", () => {
		saveOptions(KEY, { language: "en", brightness: "70" });

		expect(loadOptions(KEY)).toStrictEqual({ language: "en", brightness: "70" });
	});

	test("Nothing written down reads as nothing, not as a failure", () => {
		expect(loadOptions(KEY)).toStrictEqual({});
	});

	test("Saving again replaces what was there rather than merging into it", () => {
		saveOptions(KEY, { language: "en", brightness: "70" });
		saveOptions(KEY, { language: "de" });

		expect(loadOptions(KEY)).toStrictEqual({ language: "de" });
	});

	test("Clearing forgets everything", () => {
		saveOptions(KEY, { language: "en" });
		clearOptions(KEY);

		expect(loadOptions(KEY)).toStrictEqual({});
	});

	suite("Rubbish in storage", () => {
		test("Text that is not json is ignored rather than thrown", () => {
			localStorage.setItem(KEY, "{not json");

			expect(loadOptions(KEY)).toStrictEqual({});
		});

		test("Json that is not an object of settings is ignored", () => {
			for (const raw of ["null", "42", '"a string"', "[1, 2, 3]"]) {
				localStorage.setItem(KEY, raw);
				expect(loadOptions(KEY), raw).toStrictEqual({});
			}
		});

		test("Entries that are not strings are dropped, and the rest still read", () => {
			localStorage.setItem(KEY, JSON.stringify({ language: "en", brightness: 70, grid: null, textSpeed: "fast" }));

			// 70 and null are not values any setting offers - they were not written by
			// this, so they are not read back as if they were.
			expect(loadOptions(KEY)).toStrictEqual({ language: "en", textSpeed: "fast" });
		});
	});

	suite("Storage that refuses", () => {
		test("Reading survives a browser that throws on access", () => {
			vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
				throw new Error("The operation is insecure.");
			});

			expect(loadOptions(KEY)).toStrictEqual({});
		});

		test("Writing survives a full or blocked store", () => {
			vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("QuotaExceededError");
			});

			expect(() => saveOptions(KEY, { language: "en" })).not.toThrow();
		});

		test("Clearing survives it too", () => {
			vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
				throw new Error("The operation is insecure.");
			});

			expect(() => clearOptions(KEY)).not.toThrow();
		});
	});
});
