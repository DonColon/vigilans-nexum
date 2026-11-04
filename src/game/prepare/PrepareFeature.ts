import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { exchangeCommands } from "@/game/prepare/commands/ExchangeCommands";
import { prepareCommands } from "@/game/prepare/commands/PrepareCommands";
import { ExchangeComponent } from "@/game/prepare/components/ExchangeComponent";
import { PrepareComponent } from "@/game/prepare/components/PrepareComponent";
import { PrepareExchangeState } from "@/game/prepare/states/PrepareExchangeState";
import { PrepareState } from "@/game/prepare/states/PrepareState";
import { PrepareExchangeSystem } from "@/game/prepare/systems/PrepareExchangeSystem";
import { PrepareFlowSystem } from "@/game/prepare/systems/PrepareFlowSystem";
import { PrepareItemsRenderSystem } from "@/game/prepare/systems/PrepareItemsRenderSystem";
import { PrepareRenderSystem } from "@/game/prepare/systems/PrepareRenderSystem";
import { PrepareSystem } from "@/game/prepare/systems/PrepareSystem";

/**
 * Battle preparations: the screen between the chapter card and the first
 * turn where the player picks who takes the field, where each of them stands,
 * and what they carry - Fire Emblem's "Pick Units", "Formation" and the
 * convoy. It only appears while a campaign run is on; the deployment sheet
 * says what it may change (capacity, deploy tiles, required units).
 *
 * The feature is the wiring; [[PrepareFlowSystem]] is the flow.
 * [[PrepareSystem]] drives the cursor and the presses while the screen is on
 * top, [[PrepareExchangeSystem]] the packs once one is open against the
 * convoy or another; [[PrepareRenderSystem]] washes the deploy tiles and
 * [[PrepareItemsRenderSystem]] draws the packs under the army list.
 */
export class PrepareFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [PrepareComponent, ExchangeComponent],
			states: [PrepareState, PrepareExchangeState],
			commands: [...prepareCommands, ...exchangeCommands],
			systems: [
				// Event-driven: the screen's flow.
				{ system: PrepareFlowSystem },
				// Just ahead of CursorSystem (10): it runs the cursor commands the
				// cursor system would, so the cursor's transform syncs the same frame.
				{ system: PrepareSystem, priority: 9 },
				// With the menus' own tick (MenuSystem, 10): the packs' cursor.
				{ system: PrepareExchangeSystem, priority: 10 },
				// On the background layer with the seize marker (15): between the
				// terrain art (14) and the units (18).
				{ system: PrepareRenderSystem, priority: 15 },
				// On the ui layer above the menus (50), under the army list.
				{ system: PrepareItemsRenderSystem, priority: 56 }
			],
			...config
		});
	}
}
