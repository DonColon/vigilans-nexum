import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { ConvoyRequestedEvent, MenuCancelledEvent, MenuConfirmedEvent } from "@/game.events";
import { ConvoyComponent, ConvoyData } from "@/game/convoy/components/ConvoyComponent";
import { CONVOY_MENU, convoyChoiceRequest, convoyChoiceSlot } from "@/game/convoy/model/ConvoyMenus";
import { ConvoySystem } from "@/game/convoy/systems/ConvoySystem";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { MenuState } from "@/game/ui/states/MenuState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { dropInventoryItem, giveInventoryItem, hasPackRoom } from "@/game/units/model/Inventory";
import { isCatalogItem, isCatalogWeapon } from "@/game/units/model/UnitCatalog";
import { InventoryEntry, resolveInventoryEntry, UnitData } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * The army's convoy, and the one rule that fills it: a unit handed something it
 * has no room for does not lose it - the baggage train takes it.
 *
 *  - Anything that gives a unit an item asks for it through `convoy:requested`
 *    rather than writing to the pack itself, and hears back on
 *    `convoy:delivered` once the item has somewhere to be.
 *  - With a free slot the item simply goes into the pack and nothing else
 *    happens.
 *  - With a full pack **the player decides what goes**: a menu of the eight
 *    slots plus the incoming item, the new arrival badged and selected. Picking
 *    a carried entry sends that one to the convoy and takes the new item in;
 *    picking the new item sends it straight to the convoy and leaves the pack
 *    alone. Backing out does the same as picking the new item - by then the
 *    thing has been handed over, so "no" cannot mean "not at all", only "not
 *    into my pack".
 *
 * The convoy itself has no ceiling and, for now, no way back out: there is no
 * supply screen yet, so what goes in stays in. It is kept as ordinary pack
 * entries so the screen that eventually opens it can hand them straight back.
 */
export class ConvoyFeature extends BattleMapFeature {
	private convoy: Entity | null = null;

	/** The delivery the open choice menu belongs to. */
	private pending: { unitId: string; itemId: string } | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({ components: [ConvoyComponent], ...config });
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("convoy:requested", (event) => this.onRequested(event));
		this.subscribe("ui:menuConfirmed", (event) => this.onChoice(event));
		this.subscribe("ui:menuCancelled", (event) => this.onChoiceCancelled(event));
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.close();
	}

	private open(): void {
		this.close();

		this.convoy = this.world.createEntity();
		this.convoy.addComponent(ConvoyComponent, { items: [] });
	}

	private close(): void {
		this.pending = null;

		if (this.convoy) {
			this.world.unregisterEntity(this.convoy);
			this.convoy = null;
		}
	}

	/** Someone is handing a unit an item: put it in the pack, or ask what to give up for it. */
	private onRequested(event: ConvoyRequestedEvent): void {
		const unit = UnitSystem.byId(this.units(), event.unitId);

		if (this.convoy === null || unit === null || !this.isCatalogEntry(event.itemId)) {
			this.deliver(event.unitId, "", "");
			return;
		}

		const component = unit.getComponent(UnitComponent);
		const data = component.read();

		if (hasPackRoom(data)) {
			component.update(giveInventoryItem(data, event.itemId));
			this.deliver(event.unitId, event.itemId, "");
			return;
		}

		this.pending = { unitId: event.unitId, itemId: event.itemId };

		this.menuState().request(convoyChoiceRequest(data.inventory, this.incoming(data, event.itemId)));
		this.stateManager.push(MenuState);
	}

	/** A row of the choice menu: that entry is the one the convoy takes. */
	private onChoice(event: MenuConfirmedEvent): void {
		if (event.menu !== CONVOY_MENU || this.pending === null) {
			return;
		}

		const pending = this.pending;
		this.pending = null;

		const unit = UnitSystem.byId(this.units(), pending.unitId);

		if (unit === null) {
			this.deliver(pending.unitId, pending.itemId, "");
			return;
		}

		const component = unit.getComponent(UnitComponent);
		const data = component.read();
		const slot = convoyChoiceSlot(event.index, data.inventory.length);

		// The incoming item itself: it goes to the convoy and the pack is untouched.
		if (slot === -1) {
			this.store(this.incoming(data, pending.itemId));
			this.deliver(pending.unitId, pending.itemId, pending.itemId);
			return;
		}

		const given = data.inventory[slot];

		this.store(given);
		component.update(giveInventoryItem(dropInventoryItem(data, slot), pending.itemId));

		this.deliver(pending.unitId, pending.itemId, given.id);
	}

	/**
	 * Backed out of the choice. The item has already changed hands, so the only
	 * thing left to decide is where it goes - and the pack stays as it is.
	 */
	private onChoiceCancelled(event: MenuCancelledEvent): void {
		if (event.menu !== CONVOY_MENU || this.pending === null) {
			return;
		}

		const pending = this.pending;
		this.pending = null;

		const unit = UnitSystem.byId(this.units(), pending.unitId);

		if (unit !== null) {
			this.store(this.incoming(unit.getComponent(UnitComponent).read(), pending.itemId));
		}

		this.deliver(pending.unitId, pending.itemId, pending.itemId);
	}

	/** The incoming item as a pack entry would carry it - resolved against the receiving unit's class. */
	private incoming(unit: UnitData, itemId: string): InventoryEntry {
		return resolveInventoryEntry(itemId, unit.weaponTypes, "");
	}

	private store(entry: InventoryEntry): void {
		if (this.convoy === null) {
			return;
		}

		const component = this.convoy.getComponent(ConvoyComponent);
		component.update(ConvoySystem.store(component.read(), entry));
	}

	private deliver(unitId: string, itemId: string, storedId: string): void {
		this.events.dispatch("convoy:delivered", { unitId, itemId, storedId });
	}

	private isCatalogEntry(itemId: string): boolean {
		return itemId.length > 0 && (isCatalogWeapon(itemId) || isCatalogItem(itemId));
	}

	private read(): ConvoyData {
		if (this.convoy === null) {
			return { items: [] };
		}

		return this.convoy.getComponent(ConvoyComponent).read();
	}

	/** What the convoy is holding - for a caller that has the feature rather than the world. */
	public getItems(): readonly InventoryEntry[] {
		return this.read().items;
	}

	private units(): Entity[] {
		return UnitSystem.inWorld(this.world);
	}

	private menuState(): MenuState {
		return this.stateManager.getState(MenuState);
	}
}
