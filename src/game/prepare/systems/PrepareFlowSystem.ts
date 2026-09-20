import { AssetStorage } from "@/core/assets/AssetStorage";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Entity } from "@/core/ecs/Entity";
import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuCancelledEvent, MenuConfirmedEvent, PrepareConfirmedEvent, PrepareExchangeClosedEvent, RosterConfirmedEvent, TurnChangedEvent } from "@/game.events";
import { CampaignComponent } from "@/game/campaign/components/CampaignComponent";
import { rested } from "@/game/campaign/rules/Roster";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { activeMap } from "@/game/map/rules/ActiveMap";
import { boostPopup } from "@/game/movement/view/UnitMenus";
import { PrepareComponent, PrepareData, PrepareMode } from "@/game/prepare/components/PrepareComponent";
import { PackHolder, packHolder } from "@/game/prepare/rules/Packs";
import { canDeployMore, deployed, deploymentLimits, freeSlots, playerUnitAt } from "@/game/prepare/rules/Preparation";
import { PrepareExchangeState } from "@/game/prepare/states/PrepareExchangeState";
import { PrepareState } from "@/game/prepare/states/PrepareState";
import { RosterState } from "@/game/roster/states/RosterState";
import {
	ARMY_MENU,
	ArmyEntry,
	armyMenuRequest,
	canEquipAny,
	canUseAny,
	EQUIP_MENU,
	equipMenuRequest,
	PACK_MENU,
	PackAction,
	packMenuRequest,
	PickEntry,
	pickRosterRequest,
	PREPARE_MENU,
	prepareMenuRequest,
	PrepareRow,
	USE_MENU,
	useMenuRequest
} from "@/game/prepare/view/PrepareMenus";
import { MenuState } from "@/game/ui/states/MenuState";
import { PopupState } from "@/game/ui/states/PopupState";
import { CommanderComponent } from "@/game/units/components/CommanderComponent";
import { InventoryKind, UnitComponent, UnitData } from "@/game/units/components/UnitComponent";
import { deploymentAsset, parseDeployment } from "@/game/units/content/Deployments";
import { NO_BOOST } from "@/game/units/content/UnitCatalog";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * Fire Emblem's battle preparations, between the chapter card and the first
 * turn - only when a campaign run is on; the bare map, and every spec that
 * drives one, gets no screen:
 *
 *  - On `map:ready`, once every feature has set the battle up and the campaign
 *    has laid its run over it, the deployment's limits are read - deploy
 *    tiles, capacity, required units - into the [[PrepareComponent]], the
 *    [[PrepareState]] goes over the map and the preparations menu, centred,
 *    over that. The opening `turn:changed` is held back so no phase banner
 *    sweeps in.
 *  - **Units** opens the deploy list: the roster feature's stat table with
 *    every unit of the army on it, titled with the deployed count against the
 *    capacity and each row marked on the map, on the bench or required.
 *    Confirming one on the map benches it (its sheet kept on the roster),
 *    confirming one on the bench deploys it on a free tile, capacity
 *    allowing. Required units stay.
 *  - **Formation** frees the cursor: confirm on a player unit picks it up,
 *    confirm on a deploy tile puts it there - swapping with whoever stands
 *    there - and cancel puts it back or returns to the menu.
 *  - **Items** puts the army list across the top third of the screen - every
 *    unit, on the map or on the bench - with the highlighted unit's pack
 *    drawn under it on the left ([[PrepareItemsRenderSystem]]). Confirming a
 *    unit opens the pack menu beside its pack: **Convoy** opens the convoy on
 *    the right and the two are traded between ([[PrepareExchangeState]]);
 *    **Trade** sends the player back up to the list to choose a partner,
 *    whose pack then opens on the right the same way; **Equip** and **Use**
 *    turn the pack into a list to choose the weapon to ready or the item to
 *    use. Radiant Dawn's preparations.
 *  - **Begin** takes the screen down and sends the held `turn:changed` on,
 *    which opens the first phase the way it always has.
 */
export class PrepareFlowSystem extends ReactiveSystem {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	@GameCoreService(Display)
	private display!: Display;

	public initialize(): this {
		// After the campaign (-2) has laid its run over the battle.
		this.subscribe("map:ready", (event) => this.open(event.scenario), -3);
		this.subscribe("map:closed", () => this.close());
		// Ahead of the turn feature (0), whose banner the hold keeps down.
		this.subscribe("turn:changed", (event) => this.holdTurn(event), 10);
		this.subscribe("ui:menuConfirmed", (event) => this.onMenuConfirmed(event));
		this.subscribe("ui:menuCancelled", (event) => this.onMenuCancelled(event));
		this.subscribe("prepare:confirmed", (event) => this.onConfirmed(event));
		this.subscribe("prepare:cancelled", () => this.onCancelled());
		this.subscribe("prepare:exchangeClosed", (event) => this.onExchangeClosed(event));
		this.subscribe("roster:confirmed", (event) => this.onRosterConfirmed(event));
		this.subscribe("roster:closed", () => this.onRosterClosed());

		return this;
	}

	public dispose(): void {
		this.close();
		super.dispose();
	}

	// --- opening and closing --------------------------------------------------

	private open(scenario: string): void {
		this.close();

		if (this.world.entityWith(CampaignComponent) === null) {
			return;
		}

		let limits;

		try {
			limits = deploymentLimits(parseDeployment(this.assets.getJson(deploymentAsset(scenario))), this.assets);
		} catch (error) {
			console.error(`Deployment "${deploymentAsset(scenario)}" could not be read for the preparations:`, error);
			return;
		}

		this.world.createEntity().addComponent(PrepareComponent, PrepareComponent.open(limits.capacity, limits.slots, limits.required));
		this.stateManager.push(PrepareState);
		this.offerMenu();
		this.events.dispatch("prepare:opened", { scenario });
	}

	private close(): void {
		const prepare = this.world.entityWith(PrepareComponent);

		if (prepare !== null) {
			this.world.unregisterEntity(prepare);
		}
	}

	/** The opening turn is kept until the battle begins - the banner would freeze the screen. */
	private holdTurn(event: TurnChangedEvent): void {
		const prepare = this.world.entityWith(PrepareComponent);

		if (prepare === null) {
			return;
		}

		const component = prepare.getComponent(PrepareComponent);
		const data = component.read();

		if (data.holding) {
			component.update(PrepareComponent.holdingTurn(data, event.number, event.phase));
			event.stopPropagation();
		}
	}

	private begin(): void {
		const prepare = this.world.entityWith(PrepareComponent);

		if (prepare === null) {
			return;
		}

		const component = prepare.getComponent(PrepareComponent);
		const data = component.read();
		component.update(PrepareComponent.finished(data));

		while (this.stateManager.peek() !== null && !(this.stateManager.peek() instanceof PrepareState)) {
			this.stateManager.pop();
		}

		if (this.stateManager.peek() instanceof PrepareState) {
			this.stateManager.pop();
		}

		this.events.dispatch("prepare:finished", {});

		if (data.turnPhase !== "") {
			this.events.dispatch("turn:changed", { number: data.turnNumber, phase: data.turnPhase as TurnChangedEvent["phase"] });
		}
	}

	// --- the menus ------------------------------------------------------------

	private offerMenu(selectedIndex = 0): void {
		this.setMode(PrepareMode.MENU);
		this.stateManager.getState(MenuState).request(prepareMenuRequest(this.display.getViewportDimension(), selectedIndex));
		this.stateManager.push(MenuState);
	}

	private onMenuConfirmed(event: MenuConfirmedEvent): void {
		switch (event.menu) {
			case PREPARE_MENU:
				this.onPrepareRow(event.row);
				return;
			case ARMY_MENU:
				this.onArmyRow(event.row, event.index);
				return;
			case PACK_MENU:
				this.onPackAction(event.row);
				return;
			case EQUIP_MENU:
				this.equip(event.index);
				return;
			case USE_MENU:
				this.use(event.index);
				return;
			default:
				return;
		}
	}

	/** Backing out of a menu returns to the one before it - and the preparations menu cannot be left. */
	private onMenuCancelled(event: MenuCancelledEvent): void {
		switch (event.menu) {
			case PREPARE_MENU:
				this.offerMenu();
				return;
			case ARMY_MENU:
				this.onArmyListCancelled();
				return;
			case PACK_MENU:
				// The pack menu is gone; the list is hovering again.
				this.clearPicked();
				return;
			case EQUIP_MENU:
				this.openPackMenu(PackAction.EQUIP);
				return;
			case USE_MENU:
				this.openPackMenu(PackAction.USE);
				return;
			default:
				return;
		}
	}

	private onPrepareRow(row: string): void {
		switch (row) {
			case PrepareRow.UNITS:
				this.openPickList();
				return;
			case PrepareRow.FORMATION:
				this.setMode(PrepareMode.FORMATION);
				return;
			case PrepareRow.ITEMS:
				this.openArmyList();
				return;
			case PrepareRow.BEGIN:
				this.begin();
				return;
			default:
				return;
		}
	}

	// --- units: the deploy list -----------------------------------------------

	private openPickList(selectedIndex = 0): void {
		const prepare = this.record();

		if (prepare === null) {
			return;
		}

		this.setMode(PrepareMode.UNITS);

		const units = unitsInWorld(this.world);
		this.stateManager.getState(RosterState).request(pickRosterRequest(this.pickEntries(prepare), deployed(units).length, prepare.capacity, selectedIndex));
		this.stateManager.push(RosterState);
	}

	/** A row of the deploy list was confirmed: the unit changes sides, and the list is redrawn to say so. */
	private onRosterConfirmed(event: RosterConfirmedEvent): void {
		if (this.record()?.mode === PrepareMode.UNITS) {
			this.togglePick(event.unitId, event.selectedIndex);
		}
	}

	/** The deploy list was closed: back to the preparations menu, on "Units". */
	private onRosterClosed(): void {
		if (this.record()?.mode === PrepareMode.UNITS) {
			this.offerMenu(0);
		}
	}

	/** The army in roster order: the deployed with their live sheets, the benched with their saved ones. */
	private pickEntries(prepare: PrepareData): PickEntry[] {
		const campaign = this.world.entityWith(CampaignComponent)?.getComponent(CampaignComponent).read();
		const units = unitsInWorld(this.world);
		const entries: PickEntry[] = [];
		const listed = new Set<string>();

		for (const unit of deployed(units)) {
			const sheet = unit.getComponent(UnitComponent).read();
			entries.push({ unit: sheet, onMap: true, required: !PrepareComponent.canBench(prepare, sheet.id) });
			listed.add(sheet.id);
		}

		if (campaign !== undefined) {
			for (const benched of CampaignComponent.benched(campaign, [...listed])) {
				entries.push({ unit: benched, onMap: false, required: false });
			}
		}

		return entries;
	}

	private togglePick(unitId: string, index: number): void {
		const prepare = this.record();

		if (prepare === null || unitId === "") {
			return;
		}

		const units = unitsInWorld(this.world);
		const onMap = unitById(units, unitId);

		if (onMap !== null) {
			if (PrepareComponent.canBench(prepare, unitId)) {
				this.bench(onMap);
			}
		} else if (canDeployMore(prepare, units)) {
			this.deploy(unitId, freeSlots(prepare, units)[0]);
		}

		this.refreshPickList(index);
	}

	private refreshPickList(selectedIndex: number): void {
		const prepare = this.record();
		const state = this.stateManager.peek();

		if (prepare === null || !(state instanceof RosterState)) {
			return;
		}

		state.updateRoster(pickRosterRequest(this.pickEntries(prepare), deployed(unitsInWorld(this.world)).length, prepare.capacity, selectedIndex));
	}

	/** Takes a unit off the map; what it carries goes with it onto the roster. */
	private bench(unit: Entity): void {
		const campaignEntity = this.world.entityWith(CampaignComponent);
		const sheet = unit.getComponent(UnitComponent).read();

		if (campaignEntity !== null) {
			const campaign = campaignEntity.getComponent(CampaignComponent);
			campaign.update(CampaignComponent.withRosterEntry(campaign.read(), rested(sheet)));
		}

		this.world.unregisterEntity(unit);
		this.events.dispatch("prepare:benched", { unitId: sheet.id });
	}

	/** Puts a benched unit on a deploy tile, off its roster sheet. */
	private deploy(unitId: string, tile: GridPositionData | undefined): void {
		const campaign = this.world.entityWith(CampaignComponent)?.getComponent(CampaignComponent).read();
		const map = activeMap(this.world);
		const sheet = campaign === undefined ? null : CampaignComponent.veteran(campaign, unitId);

		if (sheet === null || map === null || tile === undefined) {
			return;
		}

		const data: UnitData = rested(sheet);
		const entity = this.world.createEntity();
		entity.addComponent(UnitComponent, data);
		entity.addComponent(GridPositionComponent, { column: tile.column, row: tile.row });
		entity.addComponent(TransformComponent, { ...identityTransform, parent: map.getID() });

		if (data.commander) {
			entity.addComponent(CommanderComponent, {});
		}

		this.events.dispatch("prepare:deployed", { unitId, column: tile.column, row: tile.row });
	}

	// --- formation: the cursor on the map ------------------------------------

	private onConfirmed(event: PrepareConfirmedEvent): void {
		const prepare = this.record();

		if (prepare === null) {
			return;
		}

		const tile = { column: event.column, row: event.row };

		if (prepare.mode === PrepareMode.FORMATION) {
			this.onFormationTile(prepare, tile);
		}
	}

	private onCancelled(): void {
		const prepare = this.record();

		if (prepare === null) {
			return;
		}

		if (prepare.picked !== "") {
			this.clearPicked();
			return;
		}

		this.offerMenu(1);
	}

	private onFormationTile(prepare: PrepareData, tile: GridPositionData): void {
		const units = unitsInWorld(this.world);

		if (prepare.picked === "") {
			const unit = playerUnitAt(units, tile);

			if (unit !== null) {
				this.setPicked(unit.getComponent(UnitComponent).read().id);
			}

			return;
		}

		const picked = unitById(units, prepare.picked);

		if (picked === null) {
			this.clearPicked();
			return;
		}

		const from = picked.getComponent(GridPositionComponent);
		const origin = from.read();

		if (origin.column === tile.column && origin.row === tile.row) {
			this.clearPicked();
			return;
		}

		if (!PrepareComponent.isSlot(prepare, tile)) {
			return;
		}

		const other = playerUnitAt(units, tile);

		if (other !== null) {
			other.getComponent(GridPositionComponent).update({ column: origin.column, row: origin.row });
		}

		from.update({ column: tile.column, row: tile.row });
		this.events.dispatch("prepare:moved", { unitId: prepare.picked, column: tile.column, row: tile.row });
		this.clearPicked();
	}

	// --- items: the army list, the pack menu and the packs -------------------

	/** The army list across the top of the screen, the highlighted unit's pack under it. */
	private openArmyList(selectedIndex = 0): void {
		this.setMode(PrepareMode.ITEMS);

		const request = armyMenuRequest(this.armyEntries(), this.display.getViewportDimension(), selectedIndex);
		const state = this.stateManager.peek();

		if (state instanceof MenuState) {
			state.updateMenu(request);
			return;
		}

		this.stateManager.getState(MenuState).request(request);
		this.stateManager.push(MenuState);
	}

	/** The army: the deployed with their live sheets, the benched with their roster ones. */
	private armyEntries(): ArmyEntry[] {
		const campaign = this.world.entityWith(CampaignComponent)?.getComponent(CampaignComponent).read();
		const entries: ArmyEntry[] = deployed(unitsInWorld(this.world)).map((unit) => ({ unit: unit.getComponent(UnitComponent).read(), onMap: true }));
		const listed = entries.map((entry) => entry.unit.id);

		if (campaign !== undefined) {
			for (const benched of CampaignComponent.benched(campaign, listed)) {
				entries.push({ unit: benched, onMap: false });
			}
		}

		return entries;
	}

	/** Everyone in the army but this unit - who a trade may be opened with. */
	private partners(unitId: string): ArmyEntry[] {
		return this.armyEntries().filter((entry) => entry.unit.id !== unitId);
	}

	/**
	 * A unit was chosen off the army list: its pack menu opens beside its
	 * pack - or, while the picked unit is looking for a trade partner, the
	 * chosen unit's pack opens against the picked one's.
	 */
	private onArmyRow(unitId: string, index: number): void {
		const prepare = this.record();

		if (prepare === null || this.holder(unitId) === null) {
			return;
		}

		if (prepare.trading) {
			if (unitId !== prepare.picked) {
				this.openExchange(prepare.picked, unitId, index);
			}

			return;
		}

		this.setPicked(unitId);
		this.openPackMenu();
	}

	/** The pack menu beside the picked unit's pack, layered over the army list. */
	private openPackMenu(row: PackAction = PackAction.CONVOY): void {
		const state = this.stateManager.peek();
		const holder = this.pickedHolder();
		const convoy = this.convoy();

		if (!(state instanceof MenuState) || holder === null || convoy === null) {
			return;
		}

		const sheet = holder.read();
		const rows: PackAction[] = [PackAction.CONVOY, PackAction.TRADE, PackAction.EQUIP, PackAction.USE];
		state.openSubmenu(packMenuRequest(sheet, this.partners(sheet.id).length, convoy.read().items.length, this.display.getViewportDimension(), rows.indexOf(row)));
	}

	private onPackAction(action: string): void {
		const state = this.stateManager.peek();
		const prepare = this.record();
		const holder = this.pickedHolder();

		if (!(state instanceof MenuState) || prepare === null || holder === null) {
			return;
		}

		const sheet = holder.read();

		switch (action) {
			case PackAction.CONVOY:
				this.openExchange(sheet.id, "", this.armyIndexOf(sheet.id));
				return;
			case PackAction.TRADE: {
				const partners = this.partners(sheet.id);

				if (partners.length === 0) {
					this.openPackMenu(PackAction.TRADE);
					return;
				}

				// Back up to the list, on the first unit that is not this one.
				this.setTrading(true);
				state.updateMenu(armyMenuRequest(this.armyEntries(), this.display.getViewportDimension(), this.armyIndexOf(partners[0].unit.id), true));
				return;
			}
			case PackAction.EQUIP:
				if (canEquipAny(sheet)) {
					state.openSubmenu(equipMenuRequest(sheet, this.display.getViewportDimension()));
				} else {
					this.openPackMenu(PackAction.EQUIP);
				}

				return;
			case PackAction.USE:
				if (canUseAny(sheet)) {
					state.openSubmenu(useMenuRequest(sheet, this.display.getViewportDimension()));
				} else {
					this.openPackMenu(PackAction.USE);
				}

				return;
			default:
				return;
		}
	}

	/** The chosen weapon is readied - it moves to the front of the pack - and the pack menu comes back. */
	private equip(index: number): void {
		const holder = this.pickedHolder();

		if (holder === null) {
			return;
		}

		const before = holder.read();
		const entry = before.inventory[index];

		if (entry !== undefined && entry.kind === InventoryKind.WEAPON && entry.equippable) {
			const after = UnitComponent.equip(before, index);

			if (after !== before) {
				holder.write(after);
				this.events.dispatch("unit:equipped", { unitId: after.id, weaponId: entry.id });
			}
		}

		this.openPackMenu(PackAction.EQUIP);
	}

	/** The chosen item is used on the unit - a booster's gains are listed the way they are in battle - and the pack menu comes back. */
	private use(index: number): void {
		const holder = this.pickedHolder();

		if (holder === null) {
			return;
		}

		const before = holder.read();
		const entry = before.inventory[index];

		if (entry === undefined || !UnitComponent.canUseItem(before, entry)) {
			this.openPackMenu(PackAction.USE);
			return;
		}

		const gains = entry.item === null ? NO_BOOST : UnitComponent.boostGains(before, entry.item);
		const after = UnitComponent.useItem(before, index);

		if (after !== before) {
			holder.write(after);
			this.events.dispatch("unit:usedItem", { unitId: after.id, itemId: entry.id, healed: after.currentHP - before.currentHP, gains });
		}

		this.openPackMenu(PackAction.USE);

		if (UnitComponent.isAnyBoost(gains)) {
			this.stateManager.getState(PopupState).request(boostPopup(after.id, entry.name, gains));
			this.stateManager.push(PopupState);
		}
	}

	/** The picked unit's pack goes up against the convoy or a partner's pack; the list stays above them, its title back to normal. */
	private openExchange(unitId: string, partnerId: string, listIndex: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof MenuState)) {
			return;
		}

		this.setTrading(false);
		state.updateMenu(armyMenuRequest(this.armyEntries(), this.display.getViewportDimension(), listIndex));
		this.stateManager.getState(PrepareExchangeState).request({ unitId, partnerId });
		this.stateManager.push(PrepareExchangeState);
	}

	/** The packs closed: the list is hovering again, on the unit whose pack it was. */
	private onExchangeClosed(event: PrepareExchangeClosedEvent): void {
		const state = this.stateManager.peek();
		const index = this.armyIndexOf(event.unitId);

		this.clearPicked();

		if (state instanceof MenuState) {
			state.updateMenu(armyMenuRequest(this.armyEntries(), this.display.getViewportDimension(), index));
		}
	}

	/**
	 * Out of the army list: back to the preparations menu - unless the list
	 * was choosing a trade partner, in which case it comes straight back with
	 * the picked unit's pack menu open on "Trade" again.
	 */
	private onArmyListCancelled(): void {
		const prepare = this.record();

		if (prepare === null || !prepare.trading) {
			this.offerMenu(2);
			return;
		}

		this.setTrading(false);
		this.stateManager.getState(MenuState).request(armyMenuRequest(this.armyEntries(), this.display.getViewportDimension(), this.armyIndexOf(prepare.picked)));
		this.stateManager.push(MenuState);
		this.openPackMenu(PackAction.TRADE);
	}

	private armyIndexOf(unitId: string): number {
		return Math.max(
			0,
			this.armyEntries().findIndex((entry) => entry.unit.id === unitId)
		);
	}

	private holder(unitId: string): PackHolder | null {
		return packHolder(this.world, unitId);
	}

	private pickedHolder(): PackHolder | null {
		const prepare = this.record();

		return prepare === null || prepare.picked === "" ? null : this.holder(prepare.picked);
	}

	// --- the record -----------------------------------------------------------

	private record(): PrepareData | null {
		return this.world.entityWith(PrepareComponent)?.getComponent(PrepareComponent).read() ?? null;
	}

	private setMode(mode: PrepareMode): void {
		const prepare = this.world.entityWith(PrepareComponent);

		if (prepare !== null) {
			const component = prepare.getComponent(PrepareComponent);
			component.update(PrepareComponent.inMode(component.read(), mode));
		}
	}

	private setPicked(unitId: string): void {
		const prepare = this.world.entityWith(PrepareComponent);

		if (prepare !== null) {
			const component = prepare.getComponent(PrepareComponent);
			component.update({ ...component.read(), picked: unitId });
		}
	}

	private clearPicked(): void {
		const prepare = this.world.entityWith(PrepareComponent);

		if (prepare !== null) {
			const component = prepare.getComponent(PrepareComponent);
			component.update({ ...component.read(), picked: "", trading: false });
		}
	}

	private setTrading(trading: boolean): void {
		const prepare = this.world.entityWith(PrepareComponent);

		if (prepare !== null) {
			const component = prepare.getComponent(PrepareComponent);
			component.update({ ...component.read(), trading });
		}
	}

	private convoy(): ConvoyComponent | null {
		return this.world.entityWith(ConvoyComponent)?.getComponent(ConvoyComponent) ?? null;
	}
}
