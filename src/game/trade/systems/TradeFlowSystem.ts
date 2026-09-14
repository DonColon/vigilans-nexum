import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { TradeRequestedEvent } from "@/game.events";
import { TradeState } from "@/game/trade/states/TradeState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitById, alliesBeside, tileOf } from "@/game/units/rules/UnitLookup";

/**
 * Opens a trade: `trade:requested` (the "Trade" command, with an ally beside
 * the unit) pushes a [[TradeState]] on its partner step.
 */
export class TradeFlowSystem extends ReactiveSystem {
	public initialize(): void {
		this.subscribe("trade:requested", (event) => this.open(event));
	}

	/**
	 * Opens the trade on the unit that asked for it. The requested ally only says
	 * which partner to point at first - every ally beside the unit is gathered
	 * here, so the player can move the cursor between them before the packs open.
	 */
	private open(event: TradeRequestedEvent): void {
		const units = unitsInWorld(this.world);
		const unit = unitById(units, event.unitId);

		if (unit === null) {
			return;
		}

		const partners = alliesBeside(units, unit);

		if (partners.length === 0) {
			return;
		}

		const partnerIds = partners.map((partner) => partner.getComponent(UnitComponent).read().id);
		const requestedIndex = partnerIds.indexOf(event.partnerId);
		const tile = tileOf(unit);

		this.stateManager.getState(TradeState).request({
			unitId: event.unitId,
			partnerIds,
			partnerIndex: requestedIndex >= 0 ? requestedIndex : 0,
			restoreColumn: tile.column,
			restoreRow: tile.row
		});
		this.stateManager.push(TradeState);
	}
}
