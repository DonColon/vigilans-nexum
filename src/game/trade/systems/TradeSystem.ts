import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { moveCursorTo } from "@/game/map/model/MapCursor";
import { TradeCommand } from "@/game/trade/commands/TradeCommands";
import { NOTHING_HELD, TradeComponent, TradeData, TradeSide } from "@/game/trade/components/TradeComponent";
import { TradeState } from "@/game/trade/states/TradeState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { swapInventorySlots, tradeInventoryItems } from "@/game/units/model/Inventory";
import { isPartnerResolved, reconcilePartner } from "@/game/units/model/PartnerChoice";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Drives the open trade. In the `partner` phase it keeps the map cursor parked
 * on the ally the player is pointing at - Fire Emblem's "who am I trading with"
 * marker - and confirm opens that ally's pack beside the unit's own. From there
 * every confirm is resolved against the two packs: the first picks an entry up,
 * the second puts it down on whichever slot the cursor has reached. A slot in
 * the other pack hands the entry over (swapping with whatever was there); a slot
 * in the same pack just rearranges it.
 *
 * Backing out of the packs returns to picking a partner; backing out of that
 * reports `trade:closed` and pops the state. Trading costs the unit nothing, so
 * it is still free to move on to a real action afterwards.
 *
 * The pack edits themselves are the pure functions in `units/model/Inventory` -
 * this system only decides which two slots they act on.
 */
export class TradeSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			units: new Query({ allowlist: [UnitComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof TradeState)) {
			return;
		}

		const entity = state.getTrade();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(TradeComponent);
		this.reconcile(component);

		const data = component.read();

		if (data.cancelled) {
			this.restoreCursor(data);
			this.eventSystem.dispatch("trade:closed", { unitId: data.unitId, partnerId: data.partnerId });
			this.stateManager.pop();
			return;
		}

		if (data.confirmed) {
			component.update(data.phase === "partner" ? openPacks(data) : this.resolveConfirm(data));
			return;
		}

		this.runCommands(elapsed, frame, state, entity);
		this.parkCursor(component.read());
	}

	/** Snaps `partnerId` to whichever ally is pointed at now. */
	private reconcile(component: TradeComponent): void {
		const data = component.read();

		if (!isPartnerResolved(data)) {
			component.update({ ...data, ...reconcilePartner(data) });
		}
	}

	/**
	 * A confirm on an open pack, resolved against the two units: pick the
	 * highlighted entry up, put a held one back down, or move it to the slot the
	 * cursor is on. Returns the trade as it stands afterwards, with the confirm
	 * consumed.
	 */
	private resolveConfirm(data: TradeData): TradeData {
		const consumed = { ...data, confirmed: false };
		const unit = this.unit(data.unitId);
		const partner = this.unit(data.partnerId);

		// One of them left the map mid-trade (it cannot happen in the running game,
		// but the screen has nothing to act on either way).
		if (unit === null || partner === null) {
			return { ...consumed, cancelled: true };
		}

		const cursorSide = data.side === TradeSide.PARTNER ? TradeSide.PARTNER : TradeSide.UNIT;
		const cursorSlot = cursorSide === TradeSide.PARTNER ? data.partnerSlot : data.unitSlot;
		const holder = cursorSide === TradeSide.PARTNER ? partner : unit;

		// Empty hands: pick the highlighted entry up. An empty slot holds nothing to
		// take, so the press does nothing.
		if (data.heldSide === NOTHING_HELD) {
			const entry = holder.getComponent(UnitComponent).read().inventory[cursorSlot];

			return entry === undefined ? consumed : { ...consumed, heldSide: cursorSide, heldSlot: cursorSlot };
		}

		const dropped = { ...consumed, heldSide: NOTHING_HELD, heldSlot: NOTHING_HELD };

		// Back on the slot it came from - the player changed their mind.
		if (data.heldSide === cursorSide && data.heldSlot === cursorSlot) {
			return dropped;
		}

		// Both ends in the same pack: the unit is only tidying its own slots.
		if (data.heldSide === cursorSide) {
			const component = holder.getComponent(UnitComponent);
			const before = component.read();
			const after = swapInventorySlots(before, data.heldSlot, cursorSlot);

			if (after !== before) {
				component.update(after);
			}

			return dropped;
		}

		return this.handOver(unit, partner, data, cursorSlot, dropped);
	}

	/** The entry crosses between the packs: the two slots swap, or a lone entry moves into a free slot. */
	private handOver(unit: Entity, partner: Entity, data: TradeData, cursorSlot: number, dropped: TradeData): TradeData {
		const unitComponent = unit.getComponent(UnitComponent);
		const partnerComponent = partner.getComponent(UnitComponent);

		const unitSlot = data.heldSide === TradeSide.UNIT ? data.heldSlot : cursorSlot;
		const partnerSlot = data.heldSide === TradeSide.PARTNER ? data.heldSlot : cursorSlot;

		const before = { left: unitComponent.read(), right: partnerComponent.read() };
		const after = tradeInventoryItems(before.left, unitSlot, before.right, partnerSlot);

		// Unchanged when the two slots had nothing to exchange; the entry is put
		// down either way.
		if (after.left !== before.left || after.right !== before.right) {
			unitComponent.update(after.left);
			partnerComponent.update(after.right);

			this.eventSystem.dispatch("trade:swapped", { unitId: data.unitId, partnerId: data.partnerId });
		}

		return dropped;
	}

	/** Keeps the map cursor on the ally being traded with, in both phases. */
	private parkCursor(data: TradeData): void {
		const partner = this.unit(data.partnerId);

		if (partner !== null) {
			moveCursorTo(this.queries.cursors.getSingleResult(), UnitSystem.tileOf(partner));
		}
	}

	private restoreCursor(data: TradeData): void {
		moveCursorTo(this.queries.cursors.getSingleResult(), { column: data.restoreColumn, row: data.restoreRow });
	}

	/** The unit with this id, out of the ones on the map right now. */
	private unit(id: string): Entity | null {
		return UnitSystem.byId(this.queries.units.getResult(), id);
	}

	private runCommands(elapsed: number, frame: number, state: TradeState, trade: Entity): void {
		for (const command of state.getCommands(TradeCommand)) {
			command.execute(elapsed, frame, { trade });
		}
	}
}

/** The partner is locked in - open the two packs with a fresh slot cursor and empty hands. */
function openPacks(data: TradeData): TradeData {
	return { ...data, phase: "trade", confirmed: false, side: TradeSide.UNIT, unitSlot: 0, partnerSlot: 0, heldSide: NOTHING_HELD, heldSlot: NOTHING_HELD };
}
