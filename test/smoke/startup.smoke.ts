import { test, expect, devices, Page } from "@playwright/test";

/** The display's layers, one canvas each (see `display.layers` in game.config.ts). */
const LAYERS = ["background", "gameplay", "ui"];

/** How many pixels across every layer are not fully transparent - a blank screen has none. */
function paintedPixels(page: Page): Promise<number> {
	return page.evaluate(() => {
		let painted = 0;

		for (const canvas of Array.from(document.querySelectorAll("canvas"))) {
			const context = canvas.getContext("2d");

			if (context === null) {
				continue;
			}

			const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

			for (let alpha = 3; alpha < data.length; alpha += 4) {
				if (data[alpha] !== 0) {
					painted++;
				}
			}
		}

		return painted;
	});
}

/** A fingerprint of what the ui layer shows - it changes when the screen does. */
function uiFingerprint(page: Page): Promise<number> {
	return page.evaluate(() => {
		const canvas = document.querySelector("canvas#ui") as HTMLCanvasElement;
		const { data } = (canvas.getContext("2d") as CanvasRenderingContext2D).getImageData(0, 0, canvas.width, canvas.height);
		let hash = 0;

		for (let index = 0; index < data.length; index += 16) {
			hash = (hash * 31 + data[index]) | 0;
		}

		return hash;
	});
}

/**
 * Listens to a page for anything going wrong: an uncaught error, an error
 * logged to the console, or a file the game asked for and did not get.
 * `screen()` reads "drawn" once the title is up, or the first error.
 */
function watch(page: Page) {
	const errors: string[] = [];
	const missing: string[] = [];

	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") {
			errors.push(message.text());
		}
	});
	page.on("response", (response) => {
		if (response.status() >= 400) {
			missing.push(`${response.status()} ${response.url()}`);
		}
	});
	page.on("requestfailed", (request) => missing.push(`${request.failure()?.errorText ?? "failed"} ${request.url()}`));

	// An error on the way ends the wait at once and is what the failure shows.
	const screen = async () => {
		if (errors.length > 0) {
			return `error: ${errors[0]}`;
		}

		return (await paintedPixels(page)) > 10_000 ? "drawn" : "blank";
	};

	const titleDrawn = () => expect.poll(screen, { message: "the title screen is drawn", timeout: 15_000 }).toBe("drawn");

	return { errors, missing, titleDrawn };
}

/**
 * Starts the game the way a player does and watches for anything going wrong
 * on the way to the title screen.
 */
test("The production build starts and draws the title screen", async ({ page }) => {
	const { errors, missing, titleDrawn } = watch(page);

	await page.goto("/");
	await titleDrawn();

	for (const layer of LAYERS) {
		await expect(page.locator(`canvas#${layer}`), `layer "${layer}"`).toHaveCount(1);
	}

	expect(errors, "errors in the browser").toStrictEqual([]);
	expect(missing, "files the game could not load").toStrictEqual([]);
});

/**
 * Once opened online, the service worker holds the whole game: with the
 * network gone, a reload still reaches the title screen and finds every file.
 */
test("Once opened, the game starts again with no network", async ({ page, context }) => {
	const { errors, missing, titleDrawn } = watch(page);

	await page.goto("/");
	await titleDrawn();

	// The worker has stored every file and controls the page.
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { message: "the service worker controls the page" }).toBe(true);

	await context.setOffline(true);
	await page.reload();
	await titleDrawn();

	expect(errors, "errors in the browser").toStrictEqual([]);
	expect(missing, "files the game could not load offline").toStrictEqual([]);
});

// The phone's own browser engine does not matter here - only its screen, its
// finger and its pixel density - so it runs in the project's Chromium.
const { defaultBrowserType: _engine, ...iPhone } = devices["iPhone 13 landscape"];

test.describe("On a phone held sideways", () => {
	test.use(iPhone);

	test("The whole game fits the screen and the touch pad drives it", async ({ page }) => {
		const { errors, missing, titleDrawn } = watch(page);

		await page.goto("/");
		await titleDrawn();

		// Shrunk to fit, not cut off: the viewport lies inside the window.
		const window = page.viewportSize() as { width: number; height: number };
		const bounds = (await page.locator("main").boundingBox()) as { x: number; y: number; width: number; height: number };

		expect(bounds.x).toBeGreaterThanOrEqual(-1);
		expect(bounds.y).toBeGreaterThanOrEqual(-1);
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(window.width + 1);
		expect(bounds.y + bounds.height).toBeLessThanOrEqual(window.height + 1);

		await expect(page.locator(".virtual-pad")).toBeVisible();
		await expect(page.locator(".rotate-hint")).toBeHidden();

		// A tap on A confirms "New game": the title gives way to the save slots.
		const title = await uiFingerprint(page);
		await page.tap(".virtual-pad__button--confirm");
		await expect.poll(() => uiFingerprint(page), { message: "A on the pad moves on from the title" }).not.toBe(title);

		expect(errors, "errors in the browser").toStrictEqual([]);
		expect(missing, "files the game could not load").toStrictEqual([]);
	});
});
