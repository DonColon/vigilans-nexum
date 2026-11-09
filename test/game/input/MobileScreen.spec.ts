import { test, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { Display } from "@/core/graphics/Display";
import { i18n } from "@/core/i18n/I18n";
import { isTouchScreen, setUpMobileScreen } from "@/game/input/MobileScreen";

/**
 * What a phone gets around the game: the note to turn the device sideways, and
 * the banner that shows an error to a player who has no console.
 */
suite("Mobile Screen Test Suite", () => {
	const display = new Display("mobile-screen-test", { dimension: { width: 1280, height: 720 } });
	const matchMedia = window.matchMedia;

	/** Pretends to be a phone (a coarse pointer) or a desktop. */
	const device = (touch: boolean) => {
		window.matchMedia = vi.fn((query: string) => ({ matches: touch && query === "(pointer: coarse)", media: query }) as MediaQueryList);
	};

	/** The banner the latest setUpMobileScreen made - earlier tests leave theirs behind in no document. */
	const banner = () => Array.from(document.querySelectorAll<HTMLElement>(".error-banner")).at(-1) as HTMLElement;

	beforeEach(() => {
		document.querySelectorAll(".error-banner, .rotate-hint").forEach((element) => element.remove());
	});

	afterEach(() => {
		window.matchMedia = matchMedia;
	});

	test("A phone is told by its coarse pointer, a desktop by its fine one", () => {
		device(true);
		expect(isTouchScreen()).toBe(true);

		device(false);
		expect(isTouchScreen()).toBe(false);
	});

	test("The note to turn the device sideways is there, for the stylesheet to show while it is upright", () => {
		device(true);
		setUpMobileScreen(display);

		const hint = document.querySelector(".rotate-hint") as HTMLElement;
		expect(hint.textContent).toBe(i18n("mobile.rotate"));
	});

	test("An error shows in a banner with its message, and a tap closes it", () => {
		device(true);
		setUpMobileScreen(display);
		expect(banner().hidden).toBe(true);

		window.dispatchEvent(new ErrorEvent("error", { error: new Error("a frame failed"), message: "a frame failed" }));

		expect(banner().hidden).toBe(false);
		expect(banner().textContent).toBe(i18n("mobile.error", { message: "a frame failed" }));

		banner().dispatchEvent(new Event("pointerup"));
		expect(banner().hidden).toBe(true);
	});

	test("The first error stays until it is closed; one after it does not replace it", () => {
		device(true);
		setUpMobileScreen(display);

		window.dispatchEvent(new ErrorEvent("error", { error: new Error("first") }));
		window.dispatchEvent(new ErrorEvent("error", { error: new Error("second") }));

		expect(banner().textContent).toContain("first");
		expect(banner().textContent).not.toContain("second");
	});

	test("A promise nobody caught shows too, by its reason", () => {
		device(true);
		setUpMobileScreen(display);

		const event = new Event("unhandledrejection") as Event & { reason: unknown };
		Object.defineProperty(event, "reason", { value: "the database would not open" });
		window.dispatchEvent(event);

		expect(banner().textContent).toContain("the database would not open");
	});

	test("A desktop has a console, so it gets no banner", () => {
		device(false);
		setUpMobileScreen(display);

		expect(document.querySelector(".error-banner")).toBeNull();
	});
});
