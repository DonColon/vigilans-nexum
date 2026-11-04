import { Entity } from "@/core/ecs/Entity";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ExchangeCommand } from "@/game/prepare/commands/ExchangeCommands";
import { ExchangeComponent, ExchangeData, ExchangeSide } from "@/game/prepare/components/ExchangeComponent";
import { convoySlots, exchangeWithConvoy, reorderConvoy } from "@/game/prepare/rules/Exchange";
import { PackHolder, packHolder } from "@/game/prepare/rules/Packs";
import { PrepareExchangeState } from "@/game/prepare/states/PrepareExchangeState";
import { tradeInventoryItems } from "@/game/trade/rules/Trading";
import { INVENTORY_SIZE, UnitComponent } from "@/game/units/components/UnitComponent";

/**
 * Drives an open exchange on the preparations screen while
 * [[PrepareExchangeState]] is on top: runs the slot cursor's commands and
 * resolves every confirm against the two sides. The first confirm picks the
 * highlighted entry up, the next puts it down on whichever row the cursor
 * has reached: a row on the other side hands the entry across - swapping
 * with whatever was there, or sending it to the convoy's empty row - and a
 * row on the same side just rearranges that side.
 *
 * The right-hand side is either another unit's pack, where the trade rules'
 * `tradeInventoryItems` says what changes hands, or the convoy, where the
 * exchange rules do. Both units' packs are read and written through their
 * holders, so a benched unit's roster entry trades like a deployed one's
 * sheet. Backing out with nothing in hand closes the exchange and reports
 * `prepare:exchangeClosed`, which puts the flow back on the army list.
 */
export class PrepareExchangeSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventBus)
	private events!: EventBus;

	@GameCoreService(World)
	private world!: World;

	public initialize(): this {
		return this;
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof PrepareExchangeState)) {
			return;
		}

		const entity = state.getExchange();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(ExchangeComponent);
		const unit = packHolder(this.world, component.read().unitId);
		const partner = this.partner(component.read());
		const convoy = this.convoy();

		// Somebody left the army mid-exchange, or there is no convoy to work
		// against: nothing to act on, the screen comes down.
		if (unit === null || convoy === null || (!ExchangeComponent.withConvoy(component.read()) && partner === null)) {
			component.update({ ...component.read(), cancelled: true });
		}

		this.clampCursor(component, convoy);

		const data = component.read();

		if (data.cancelled) {
			this.events.dispatch("prepare:exchangeClosed", { unitId: data.unitId });
			this.stateManager.pop();
			return;
		}

		if (data.confirmed && unit !== null && convoy !== null) {
			component.update(this.resolveConfirm(data, unit, partner, convoy));
			this.clampCursor(component, convoy);
			return;
		}

		this.runCommands(elapsed, frame, state, entity, this.rowsOf(data, convoy));
	}

	/**
	 * A confirm, resolved against the two sides: pick the highlighted entry up,
	 * put a held one back down, or move it to the row the cursor is on.
	 * Returns the exchange as it stands afterwards, with the confirm consumed.
	 */
	private resolveConfirm(data: ExchangeData, unit: PackHolder, partner: PackHolder | null, convoy: ConvoyComponent): ExchangeData {
		const consumed = { ...data, confirmed: false };
		const cursorSide = data.side === ExchangeSide.OTHER ? ExchangeSide.OTHER : ExchangeSide.PACK;
		const cursorSlot = ExchangeComponent.cursorSlot(data);

		// Empty hands: pick the highlighted entry up. An empty row holds nothing
		// to take, so the press does nothing.
		if (!ExchangeComponent.isHolding(data)) {
			const entry = cursorSide === ExchangeSide.PACK ? unit.read().inventory[cursorSlot] : partner === null ? convoy.read().items[cursorSlot] : partner.read().inventory[cursorSlot];

			return entry === undefined ? consumed : { ...consumed, heldSide: cursorSide, heldSlot: cursorSlot };
		}

		const dropped = ExchangeComponent.dropped(data);

		// Back on the row it came from - the player changed their mind.
		if (data.heldSide === cursorSide && data.heldSlot === cursorSlot) {
			return dropped;
		}

		// Both ends on the same side: only tidying that side.
		if (data.heldSide === cursorSide) {
			if (cursorSide === ExchangeSide.PACK) {
				unit.write(UnitComponent.swapSlots(unit.read(), data.heldSlot, cursorSlot));
			} else if (partner !== null) {
				partner.write(UnitComponent.swapSlots(partner.read(), data.heldSlot, cursorSlot));
			} else {
				convoy.update(reorderConvoy(convoy.read(), data.heldSlot, cursorSlot));
			}

			return dropped;
		}

		const packIndex = data.heldSide === ExchangeSide.PACK ? data.heldSlot : cursorSlot;
		const otherIndex = data.heldSide === ExchangeSide.PACK ? cursorSlot : data.heldSlot;

		if (partner !== null) {
			this.tradeWith(unit, packIndex, partner, otherIndex);
		} else {
			this.exchangeWith(unit, packIndex, convoy, otherIndex);
		}

		return dropped;
	}

	/** One pack slot across to the partner, Fire Emblem's trade - and whatever was there back. */
	private tradeWith(unit: PackHolder, packIndex: number, partner: PackHolder, partnerIndex: number): void {
		const before = { left: unit.read(), right: partner.read() };
		const after = tradeInventoryItems(before.left, packIndex, before.right, partnerIndex);

		if (after.left === before.left && after.right === before.right) {
			return;
		}

		unit.write(after.left);
		partner.write(after.right);

		const given = before.left.inventory[packIndex];
		const taken = before.right.inventory[partnerIndex];

		if (given !== undefined) {
			this.events.dispatch("prepare:traded", { unitId: before.left.id, partnerId: before.right.id, itemId: given.id });
		}

		if (taken !== undefined) {
			this.events.dispatch("prepare:traded", { unitId: before.right.id, partnerId: before.left.id, itemId: taken.id });
		}
	}

	/** One pack slot into the convoy, or one of the convoy's entries into the pack - and whatever was there back. */
	private exchangeWith(unit: PackHolder, packIndex: number, convoy: ConvoyComponent, convoyIndex: number): void {
		const before = { unit: unit.read(), convoy: convoy.read() };
		const after = exchangeWithConvoy(before.unit, packIndex, before.convoy, convoyIndex);

		if (after.unit === before.unit && after.convoy === before.convoy) {
			return;
		}

		unit.write(after.unit);
		convoy.update(after.convoy);

		const stored = before.unit.inventory[packIndex];
		const taken = before.convoy.items[convoyIndex];

		if (stored !== undefined) {
			this.events.dispatch("prepare:stored", { unitId: before.unit.id, itemId: stored.id });
		}

		if (taken !== undefined) {
			this.events.dispatch("prepare:taken", { unitId: before.unit.id, itemId: taken.id });
		}
	}

	/** How many rows the cursor's side has: a pack's slots, or the convoy's entries and the empty row after them. */
	private rowsOf(data: ExchangeData, convoy: ConvoyComponent | null): number {
		if (data.side !== ExchangeSide.OTHER || !ExchangeComponent.withConvoy(data)) {
			return INVENTORY_SIZE;
		}

		return convoy === null ? 0 : convoySlots(convoy.read()).length;
	}

	/** Keeps the convoy's cursor on a row that exists - the list shrinks when something is taken out. */
	private clampCursor(component: ExchangeComponent, convoy: ConvoyComponent | null): void {
		const data = component.read();

		if (!ExchangeComponent.withConvoy(data) || convoy === null) {
			return;
		}

		const last = convoySlots(convoy.read()).length - 1;

		if (data.otherSlot > last) {
			component.update({ ...data, otherSlot: last });
		}
	}

	private partner(data: ExchangeData): PackHolder | null {
		return ExchangeComponent.withConvoy(data) ? null : packHolder(this.world, data.partnerId);
	}

	private convoy(): ConvoyComponent | null {
		return this.world.entityWith(ConvoyComponent)?.getComponent(ConvoyComponent) ?? null;
	}

	private runCommands(elapsed: number, frame: number, state: PrepareExchangeState, exchange: Entity, rows: number): void {
		for (const command of state.getCommands(ExchangeCommand)) {
			command.execute(elapsed, frame, { exchange, rows });
		}
	}
}
