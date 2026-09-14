import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { tradeCommands } from "@/game/trade/commands/TradeCommands";
import { TradeComponent } from "@/game/trade/components/TradeComponent";
import { TradeState } from "@/game/trade/states/TradeState";
import { TradeFlowSystem } from "@/game/trade/systems/TradeFlowSystem";
import { TradeRenderSystem } from "@/game/trade/systems/TradeRenderSystem";
import { TradeSystem } from "@/game/trade/systems/TradeSystem";

/**
 * Fire Emblem's trade, layered on top of the [[MovementFeature]]: two allied
 * units standing next to each other can swap what they carry.
 *
 *  - `trade:requested` (the "Trade" command, with an ally beside the unit) opens
 *    a [[TradeState]] on its partner step - the map cursor sits on the ally that
 *    would be traded with, and any direction moves it between the others in
 *    reach, the way the battle forecast picks a target.
 *  - Confirm opens that ally's pack beside the unit's own. Up / down moves the
 *    cursor through a pack, left / right crosses to the other one. Confirm picks
 *    an entry up, confirm again on another slot puts it down - onto an entry to
 *    swap the two, onto an empty slot to hand it over. Cancel drops a held
 *    entry, then drops back to picking a partner, then out of the trade.
 *  - Closing reports `trade:closed`. Trading is a free action, so the
 *    MovementFeature simply re-opens the unit's command menu - it still has its
 *    turn to spend.
 *
 * The feature is the wiring; [[TradeFlowSystem]] opens the trade,
 * [[TradeSystem]] drives it while it is up.
 */
export class TradeFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [TradeComponent],
			states: [TradeState],
			commands: [...tradeCommands],
			systems: [
				// Event-driven: opens the trade. Order among the update systems does not matter.
				{ system: TradeFlowSystem, priority: 9 },
				// Alongside MenuSystem / ForecastSystem in the update phase.
				{ system: TradeSystem, priority: 10 },
				// After UIRenderSystem (50), which owns and clears the "ui" layer.
				{ system: TradeRenderSystem, priority: 53 }
			],
			...config
		});
	}
}
