import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { Display } from "@/core/graphics/Display";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { UserGestures } from "@/core/UserGestures";
import { optionsCommands } from "@/game/options/commands/OptionsCommands";
import { OptionsComponent } from "@/game/options/components/OptionsComponent";
import { OptionsService } from "@/core/options/OptionsService";
import { adoptFullscreen, gameSettings, syncGameOptions, wantsFullscreen } from "@/game/options/GameSettings";
import { OptionsState } from "@/game/options/states/OptionsState";
import { OptionsRenderSystem } from "@/game/options/systems/OptionsRenderSystem";
import { OptionsSystem } from "@/game/options/systems/OptionsSystem";

/**
 * The options screen, opened from the map's own command menu.
 *
 *  - `options:requested` (the "Options" row of the global menu) opens an
 *    [[OptionsState]] over the map, which freezes it the way a menu does.
 *  - Up and down pick a setting, left and right change it, confirm or cancel
 *    closes. A change lands the moment it is made - there is no "apply".
 *  - The settings themselves live on the [[OptionsService]], not on this
 *    feature, because the things they affect are scattered: the textbox paces
 *    its reveal by one, the grid renderer draws its lines by another, the combat
 *    feature decides whether to play an animation by a third. This feature only
 *    owns the *screen*. Even the language is applied by the service, which
 *    switches the I18nService the moment the setting changes - so a cycle takes
 *    effect under the cursor rather than on the way out.
 *
 * Settings are written down as they change and read back on the next visit.
 *
 * Fullscreen is the one that cannot simply be restored. A page is not allowed to
 * enter fullscreen on load - the browser requires a real user gesture behind the
 * request and refuses without one - so a remembered "on" is carried until the
 * player touches something, and applied on that first gesture. It is the closest
 * the web allows to starting in fullscreen, and it is the same trick the
 * AudioDevice uses to unlock its AudioContext.
 */
export class OptionsFeature extends GameFeature {
	/** Row the screen was last left on, so re-opening it comes back to the same setting. */
	private lastIndex = 0;

	/** Drops the fullscreenchange subscription when the feature is uninstalled. */
	private unwatchFullscreen: (() => void) | null = null;

	/** The one-shot gesture listener that restores a remembered fullscreen, while it is still armed. */
	private restoreFullscreen: (() => void) | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [OptionsComponent],
			states: [OptionsState],
			commands: [...optionsCommands],
			systems: [
				// Alongside MenuSystem / RosterSystem in the update phase.
				{ system: OptionsSystem, priority: 10 },
				// Above the corner HUDs (54, 55), like the army list.
				{ system: OptionsRenderSystem, priority: 56 }
			],
			...config
		});
	}

	protected onInstall(): void {
		// The catalog and the audio device are both up by the time features install,
		// so this is where the choices become what the game was actually built with -
		// and where every setting is pushed out to the device it drives.
		syncGameOptions();

		this.subscribe("options:requested", () => this.open());
		this.subscribe("options:closed", (event) => (this.lastIndex = Math.max(0, event.selectedIndex)));

		this.watchFullscreen();
		this.armFullscreenRestore();
	}

	protected onUninstall(): void {
		this.unwatchFullscreen?.();
		this.unwatchFullscreen = null;

		this.disarmFullscreenRestore();
	}

	/**
	 * Keeps the fullscreen row in step with the browser, which can leave it on its
	 * own - Escape, or the window chrome - without telling whoever asked for it.
	 */
	private watchFullscreen(): void {
		const display = this.display();

		this.unwatchFullscreen = display?.addFullscreenListener((fullscreen) => adoptFullscreen(fullscreen)) ?? null;
	}

	/**
	 * Carries a remembered "fullscreen on" until the player touches something. The
	 * request is made from inside the gesture handler, which is the only place the
	 * browser will grant it, and the listener comes off either way - a refusal is
	 * the player's answer too.
	 */
	private armFullscreenRestore(): void {
		if (!wantsFullscreen()) {
			return;
		}

		const onGesture = () => {
			this.disarmFullscreenRestore();
			void this.display()?.enterFullscreen();
		};

		this.restoreFullscreen = onGesture;

		for (const gesture of UserGestures) {
			document.addEventListener(gesture, onGesture);
		}
	}

	private disarmFullscreenRestore(): void {
		const listener = this.restoreFullscreen;

		if (listener === null) {
			return;
		}

		this.restoreFullscreen = null;

		for (const gesture of UserGestures) {
			document.removeEventListener(gesture, listener);
		}
	}

	private display(): Display | null {
		return ServiceRegistry.has(Display) ? ServiceRegistry.get<Display>(Display) : null;
	}

	private open(): void {
		const optionIds = this.options()
			.all()
			.map((definition) => definition.id);

		this.stateManager.getState(OptionsState).request({ optionIds, selectedIndex: this.lastIndex });
		this.stateManager.push(OptionsState);
	}

	private options(): OptionsService {
		return gameSettings();
	}
}
