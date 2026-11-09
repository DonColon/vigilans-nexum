import { Display } from "@/core/graphics/Display";
import { DisplayOrientation } from "@/core/graphics/DisplayOrientation";
import { i18n } from "@/core/i18n/I18n";

/** Whether the main pointer is a finger - a phone or a tablet. */
export function isTouchScreen(): boolean {
	return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/** Whether the game runs installed from the home screen, already fullscreen. */
function isInstalled(): boolean {
	return typeof window.matchMedia === "function" && (window.matchMedia("(display-mode: fullscreen)").matches || window.matchMedia("(display-mode: standalone)").matches);
}

/**
 * What a phone needs around the game that a desktop does not: a note to turn
 * the device sideways while it is held upright (the stylesheet shows it only
 * then, `.rotate-hint`), and fullscreen in landscape on the first touch - the
 * browser grants fullscreen only in answer to a gesture, and without it the
 * address bar takes a good part of a small screen. Installed from the home
 * screen, the game starts fullscreen and in landscape on its own (manifest.json).
 */
export function setUpMobileScreen(display: Display): void {
	showErrorsOnScreen();

	const hint = document.createElement("div");
	hint.className = "rotate-hint";
	hint.setAttribute("role", "status");
	hint.textContent = i18n("mobile.rotate");
	document.body.append(hint);

	if (!isTouchScreen() || isInstalled()) {
		return;
	}

	window.addEventListener(
		"touchend",
		() => {
			void display.enterFullscreen().then((fullscreen) => {
				if (fullscreen) {
					display.lockOrientation(DisplayOrientation.LANDSCAPE);
				}
			});
		},
		{ once: true }
	);
}

/**
 * A phone has no console: an error the game runs into - a frame that threw, a
 * promise nobody caught - is shown in a banner at the top instead, so the player
 * can see that something went wrong and send a screenshot of it. Only on a touch
 * screen; a tap closes it. The first error stays until then, later ones wait.
 */
function showErrorsOnScreen(): void {
	if (!isTouchScreen()) {
		return;
	}

	const banner = document.createElement("div");
	banner.className = "error-banner";
	banner.setAttribute("role", "alert");
	banner.hidden = true;
	banner.addEventListener("pointerup", () => {
		banner.hidden = true;
	});
	document.body.append(banner);

	const show = (reason: unknown) => {
		if (!banner.hidden) {
			return;
		}

		const message = reason instanceof Error ? reason.message : String(reason);
		banner.textContent = i18n("mobile.error", { message });
		banner.hidden = false;
	};

	window.addEventListener("error", (event) => show(event.error ?? event.message));
	window.addEventListener("unhandledrejection", (event) => show(event.reason));
}
