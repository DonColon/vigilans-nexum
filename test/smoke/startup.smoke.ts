import { test, expect, Page } from "@playwright/test";

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

/**
 * Starts the game the way a player does and watches for anything going wrong
 * on the way to the title screen: an uncaught error, an error logged to the
 * console, or a file the game asked for and did not get.
 */
test("The production build starts and draws the title screen", async ({ page }) => {
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

	await page.goto("/");

	// The bundle loads, the title state is entered and its first frames drawn.
	// An error on the way ends the wait at once and is what the failure shows.
	const screen = async () => {
		if (errors.length > 0) {
			return `error: ${errors[0]}`;
		}

		return (await paintedPixels(page)) > 10_000 ? "drawn" : "blank";
	};

	await expect.poll(screen, { message: "the title screen is drawn", timeout: 15_000 }).toBe("drawn");

	for (const layer of LAYERS) {
		await expect(page.locator(`canvas#${layer}`), `layer "${layer}"`).toHaveCount(1);
	}

	expect(errors, "errors in the browser").toStrictEqual([]);
	expect(missing, "files the game could not load").toStrictEqual([]);
});
