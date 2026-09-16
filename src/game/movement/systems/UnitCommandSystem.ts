import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { Entity } from "@/core/ecs/Entity";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import {
	ChestOpenedEvent,
	CombatCancelledEvent,
	CombatResolvedEvent,
	DoorOpenedEvent,
	StaffCancelledEvent,
	StaffResolvedEvent,
	LockCancelledEvent,
	MenuConfirmedEvent,
	MenuCancelledEvent,
	PopupClosedEvent,
	TalkCancelledEvent,
	TalkFinishedEvent,
	TradeClosedEvent,
	UnitMovedEvent,
	VisitCancelledEvent,
	VisitFinishedEvent
} from "@/game.events";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { MovementComponent } from "@/game/movement/components/MovementComponent";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import {
	COMMAND_MENU,
	GLOBAL_MENU,
	ITEMS_MENU,
	ITEM_ACTION_MENU,
	ITEMS_MENU_WIDTH,
	ITEM_ACTION_MENU_GAP,
	UnitMenuRow,
	boostPopup,
	itemActionRequest,
	itemsRequest,
	unitCommandRequest
} from "@/game/movement/view/UnitMenus";
import { NO_BOOST } from "@/game/units/content/UnitCatalog";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitById, enemiesOf, alliesBeside, tileOf } from "@/game/units/rules/UnitLookup";
import { targetsInReach } from "@/game/combat/rules/Targeting";
import { canUseStaff } from "@/game/staff/rules/Staves";
import { LocksComponent } from "@/game/locks/components/LocksComponent";
import { Chest, Door } from "@/game/locks/content/Locks";
import { doorBeside, chestAt } from "@/game/locks/rules/Locking";
import { PopupState } from "@/game/ui/states/PopupState";
import { TalkComponent } from "@/game/talk/components/TalkComponent";
import { availableTalk } from "@/game/talk/rules/Talks";
import { MenuRequest, MenuState } from "@/game/ui/states/MenuState";
import { ObjectiveComponent } from "@/game/objective/components/ObjectiveComponent";
import { canSeize } from "@/game/objective/rules/Outcome";
import { VisitComponent } from "@/game/visit/components/VisitComponent";
import { House } from "@/game/visit/content/Houses";
import { availableHouse } from "@/game/visit/rules/Visits";
import { activeCursor, tileToScreen } from "@/game/map/rules/ActiveMap";

/**
 * The Fire Emblem move flow, wired to the map's `map:*` events on top of the
 * units the [[UnitsFeature]] deploys:
 *
 *  - Confirm on one of your units picks it up and lights the movement (blue) and
 *    attack (red) tiles; `PathPreviewSystem` traces the shortest route to the
 *    cursor.
 *  - Confirm again on a blue tile walks it there and opens the command menu
 *    beside it. "Attack" opens the battle forecast (`combat:requested`); the
 *    forecast itself moves the map cursor between the enemies in reach, Fire
 *    Emblem style. "Items" opens the unit's pack; a row opens a per-item menu to
 *    use / equip / unequip / drop it (`unit:usedItem` / `unit:equipped` /
 *    `unit:unequipped` / `unit:droppedItem`). "Use" heals the unit off a
 *    vulnerary-style consumable, or raises its stats for good off a booster -
 *    a notice lists the gains first - and spends its turn. "Wait" spends the
 *    unit (it greys out, `unit:acted`); backing out reverts the move and
 *    re-opens the range.
 *  - "Staff" hands off to the staff feature (`staff:requested`), which offers the
 *    unit's staves and then moves the map cursor between the wounded allies in
 *    reach. It only shows when the unit carries a staff with someone to use it
 *    on; raising one spends the unit.
 *  - "Door" and "Chest" hand off to the locks feature (`door:requested` /
 *    `chest:requested`). "Door" shows beside a locked door when the unit carries
 *    a door key, "Chest" on or beside a locked chest when it carries a chest key; opening
 *    either spends the unit.
 *  - "Trade" hands off to the trade screen (`trade:requested`), which first
 *    moves the map cursor onto the ally to trade with and then opens both packs.
 *    Closing it puts the command menu back.
 *  - "Talk" hands off to the talk feature (`talk:requested`), which plays the
 *    conversation the scenario wrote for the pair - moving the map cursor
 *    between them first when several are in reach. It only shows when someone
 *    beside the unit still has something to say.
 *  - "Visit" hands off to the visit feature (`visit:requested`), which plays what
 *    the villager has to say and shuts the door behind the unit. It only shows
 *    when the unit is standing beside the door of a house nobody has called on.
 *  - "Seize" hands off to the objective feature (`seize:requested`), which
 *    decides the battle. It only shows for the commander standing on the tile a
 *    seize is won on, and it spends the unit - the battle's last action.
 *
 * Only some of those commands finish the unit's turn: "Wait", a used item, a
 * resolved fight, a raised staff, an opened lock and a visited house all spend
 * it (`unit:acted`, the token greys out). Talking, trading, equipping,
 * unequipping and dropping are free - the command menu comes back and the unit
 * still has its action.
 *  - Confirm off the range or `map:cancelled` sets it back down without moving.
 *  - Confirm on a tile with nothing to pick up opens the global command menu
 *    next to the cursor: "Objective" opens the objective readout
 *    (`objective:requested`), "Units" opens the army list (`roster:requested`),
 *    "Options" the settings screen (`options:requested`), "End Turn" ends the
 *    turn (`turn:end`).
 *
 * The menus themselves are built in `view/UnitMenus`; this feature only decides
 * when one opens and what a chosen row does.
 *
 * It handles `map:tileConfirmed` at priority 10 and stops the event once it has
 * consumed a press.
 */
export class UnitCommandSystem extends ReactiveSystem {
	private actionSlot = -1;
	private boosting: string | null = null;

	public initialize(): this {
		this.subscribe("map:closed", () => {
			this.boosting = null;
			this.actionSlot = -1;
		});
		this.subscribe("unit:moved", (event) => this.onArrived(event));
		this.subscribe("ui:menuConfirmed", (event) => this.onCommand(event));
		this.subscribe("ui:menuCancelled", (event) => this.onCommandCancelled(event));
		this.subscribe("combat:cancelled", (event) => this.onCombatCancelled(event));
		this.subscribe("combat:resolved", (event) => this.onCombatResolved(event));
		this.subscribe("trade:closed", (event) => this.onTradeClosed(event));
		this.subscribe("talk:finished", (event) => this.onTalkFinished(event));
		this.subscribe("talk:cancelled", (event) => this.onTalkCancelled(event));
		this.subscribe("visit:finished", (event) => this.onVisitFinished(event));
		this.subscribe("visit:cancelled", (event) => this.onVisitCancelled(event));
		this.subscribe("staff:resolved", (event) => this.onStaffResolved(event));
		this.subscribe("staff:cancelled", (event) => this.onStaffCancelled(event));
		this.subscribe("door:opened", (event) => this.onDoorOpened(event));
		this.subscribe("chest:opened", (event) => this.onChestOpened(event));
		this.subscribe("lock:cancelled", (event) => this.onLockCancelled(event));
		this.subscribe("ui:popupClosed", (event) => this.onPopupClosed(event));

		return this;
	}

	/** Pack slot the open item-action menu (equip / unequip / drop) works on. */
	/** The unit whose stat-gain notice is on screen, so it can be spent once the notice is acknowledged. */
	/**
	 * Sends the unit off along the shortest route to `target`. The logical tile
	 * jumps to the target now - occupancy and blocking stay correct - and the
	 * token walks the route to catch up. The command menu opens on `unit:moved`,
	 * once the walk lands.
	 */
	/** The walk landed - open the command menu tucked against the unit. */
	private onArrived(event: UnitMovedEvent): void {
		const mover = unitById(this.units(), event.unitId);

		if (mover === null || !mover.hasComponent(PendingMoveComponent)) {
			return;
		}

		this.openCommandMenu(mover);
	}

	/** The unit command menu: every command the unit could take from where it stands, then "Wait" - see `unitCommandRows`. */
	private openCommandMenu(mover: Entity): void {
		const data = mover.getComponent(UnitComponent).read();
		const position = tileOf(mover);

		const commands = {
			canSeize: this.canSeize(mover),
			canAttack: this.attackTargets(mover).length > 0,
			canUseStaff: canUseStaff(data, position, this.units()),
			canVisit: this.house(mover) !== null,
			canOpenChest: this.chest(mover) !== null,
			canOpenDoor: this.door(mover) !== null,
			canTalk: this.talkPartner(mover) !== null,
			canTrade: this.tradePartners(mover).length > 0
		};

		this.openMenu(unitCommandRequest(data, commands), position.column, position.row);
	}

	/**
	 * The unit beside this one it still has a conversation with, or null. The
	 * conversations are the talk feature's, but the lookup over them is pure - the
	 * same way "Attack" asks the targeting rules what is in reach.
	 */
	private talkPartner(mover: Entity): Entity | null {
		const talk = this.world.entityWith(TalkComponent);

		if (talk === null) {
			return null;
		}

		return availableTalk(talk.getComponent(TalkComponent).read(), this.units(), mover)?.partner ?? null;
	}

	/**
	 * Whether this unit can claim the objective from where it stands - the
	 * commander on the tile a seize is won on. The objective is the objective
	 * feature's, but the check over it is pure - the same way "Visit" asks the
	 * visit rules about the houses.
	 */
	private canSeize(mover: Entity): boolean {
		const objective = this.world.entityWith(ObjectiveComponent);

		return objective !== null && canSeize(objective.getComponent(ObjectiveComponent).read(), mover);
	}

	/**
	 * The house this unit is standing beside and could still knock at, or null. The
	 * houses are the visit feature's, but the lookup over them is pure - the same
	 * way "Attack" asks the targeting rules what is in reach.
	 */
	private house(mover: Entity): House | null {
		const visit = this.world.entityWith(VisitComponent);

		if (visit === null) {
			return null;
		}

		return availableHouse(visit.getComponent(VisitComponent).read(), mover);
	}

	/**
	 * The locked door this unit is standing beside and has a key for, or null. The
	 * locks are the locks feature's, but the lookup over them is pure - the same
	 * way "Visit" asks the visit rules about the houses.
	 */
	private door(mover: Entity): Door | null {
		const locks = this.world.entityWith(LocksComponent);

		if (locks === null) {
			return null;
		}

		return doorBeside(locks.getComponent(LocksComponent).read(), mover);
	}

	/** The locked chest this unit is standing on or beside and has a key for, or null. */
	private chest(mover: Entity): Chest | null {
		const locks = this.world.entityWith(LocksComponent);

		if (locks === null) {
			return null;
		}

		return chestAt(locks.getComponent(LocksComponent).read(), mover);
	}

	/** Every ally standing next to this unit - the ones it could trade packs with. */
	private tradePartners(mover: Entity): Entity[] {
		return alliesBeside(this.units(), mover);
	}

	/**
	 * Drops the command menu and hands off to the TradeFeature, the way "Attack"
	 * hands off to the forecast. `partnerId` is just the first ally beside the
	 * unit - the trade screen picks up every other one and lets the player move
	 * the map cursor between them.
	 */
	private requestTrade(mover: Entity, partner: Entity): void {
		this.closeOpenMenu();

		this.events.dispatch("trade:requested", {
			unitId: mover.getComponent(UnitComponent).read().id,
			partnerId: partner.getComponent(UnitComponent).read().id
		});
	}

	/**
	 * Every enemy this unit could strike from where it stands - the ones something
	 * in its pack reaches - nearest first. Empty when there is no one to attack.
	 */
	private attackTargets(mover: Entity): Entity[] {
		const data = mover.getComponent(UnitComponent).read();
		const enemies = enemiesOf(this.units(), data.faction);

		return targetsInReach(data, tileOf(mover), enemies, tileOf);
	}

	/**
	 * Drops the command menu and opens the battle forecast. `defender` is just the
	 * nearest enemy - the forecast picks up every other enemy in reach and lets
	 * the player cycle the map cursor between them.
	 */
	private requestCombat(attacker: Entity, defender: Entity): void {
		// The command menu is already gone in-game (MenuSystem popped it); a test
		// driving the events by hand still has it on top, so drop it.
		this.closeOpenMenu();

		this.events.dispatch("combat:requested", {
			attackerId: attacker.getComponent(UnitComponent).read().id,
			defenderId: defender.getComponent(UnitComponent).read().id
		});
	}

	/** The unit's pack: every carried weapon and item, the readied weapon badged. Replaces the command menu. */
	private openItemsMenu(mover: Entity, selectedIndex?: number): void {
		const anchor = this.tileOnScreen(mover);

		if (anchor === null) {
			return;
		}

		this.closeOpenMenu();
		this.pushMenu(itemsRequest(mover.getComponent(UnitComponent).read(), anchor, selectedIndex));
	}

	/** Rebuilds the still-open items menu after the pack changed (badge moved, item dropped, ...). */
	private refreshItemsMenu(mover: Entity, selectedIndex?: number): void {
		const anchor = this.tileOnScreen(mover);

		if (anchor === null) {
			return;
		}

		this.menuState().updateMenu(itemsRequest(mover.getComponent(UnitComponent).read(), anchor, selectedIndex));
	}

	/**
	 * The per-item menu, layered on top of the items menu, which stays on screen;
	 * `actionSlot` remembers which pack entry it acts on.
	 */
	private openItemActionMenu(mover: Entity, index: number): void {
		const data = mover.getComponent(UnitComponent).read();
		const entry = data.inventory[index];
		const state = this.menuState();
		const itemsMenu = state.getMenu();

		if (entry === undefined || itemsMenu === null) {
			return;
		}

		this.actionSlot = index;

		// Just right of the items panel, top edges aligned.
		const panel = itemsMenu.getComponent(TransformComponent).read();
		const position = { x: panel.x + ITEMS_MENU_WIDTH + ITEM_ACTION_MENU_GAP, y: panel.y };

		state.openSubmenu(itemActionRequest(data, entry, position));
	}

	/**
	 * Pushes a menu tucked against a map tile. A menu already on top is popped
	 * first, so this also replaces the command menu with the items menu and back
	 * without stacking MenuState on itself.
	 */
	private onCommand(event: MenuConfirmedEvent): void {
		if (event.menu === GLOBAL_MENU) {
			if (event.row === UnitMenuRow.OBJECTIVE) {
				// The objective feature owns the readout; it puts the screen up.
				this.events.dispatch("objective:requested", {});
			} else if (event.row === UnitMenuRow.UNITS) {
				// The roster feature takes it from here - it gathers the army and puts
				// the list up. Nothing about the map changes.
				this.events.dispatch("roster:requested", {});
			} else if (event.row === UnitMenuRow.OPTIONS) {
				// Likewise the options feature, which owns the settings screen.
				this.events.dispatch("options:requested", {});
			} else if (event.row === UnitMenuRow.END_TURN) {
				this.events.dispatch("turn:end", {});
			}

			return;
		}

		const mover = this.pendingMover();

		if (mover === null) {
			return;
		}

		if (event.menu === ITEMS_MENU) {
			this.openItemActionMenu(mover, event.index);
			return;
		}

		if (event.menu === ITEM_ACTION_MENU) {
			this.onItemAction(mover, event.row);
			return;
		}

		if (event.menu !== COMMAND_MENU) {
			return;
		}

		if (event.row === UnitMenuRow.SEIZE) {
			if (this.canSeize(mover)) {
				// Claiming the objective is the unit's action - and the battle's last. The
				// objective feature takes it from here and decides the day.
				this.closeOpenMenu();
				this.spendMover(mover);
				this.events.dispatch("seize:requested", { unitId: mover.getComponent(UnitComponent).read().id });
			}

			return;
		}

		if (event.row === UnitMenuRow.ATTACK) {
			const [nearest] = this.attackTargets(mover);

			if (nearest !== undefined) {
				// The forecast takes it from here - it gathers every enemy in reach
				// and moves the cursor between them.
				this.requestCombat(mover, nearest);
			}

			return;
		}

		if (event.row === UnitMenuRow.STAFF) {
			// The staff feature takes it from here - it offers the staves and moves
			// the cursor between the wounded allies in reach.
			this.closeOpenMenu();
			this.events.dispatch("staff:requested", { unitId: mover.getComponent(UnitComponent).read().id });
			return;
		}

		if (event.row === UnitMenuRow.CHEST) {
			const chest = this.chest(mover);

			if (chest !== null) {
				// The locks feature takes it from here - it opens the lid and hands
				// over what was inside.
				this.closeOpenMenu();
				this.events.dispatch("chest:requested", { unitId: mover.getComponent(UnitComponent).read().id, chestId: chest.id });
			}

			return;
		}

		if (event.row === UnitMenuRow.DOOR) {
			const door = this.door(mover);

			if (door !== null) {
				// Likewise the locks feature, which swings the door open on the map.
				this.closeOpenMenu();
				this.events.dispatch("door:requested", { unitId: mover.getComponent(UnitComponent).read().id, doorId: door.id });
			}

			return;
		}

		if (event.row === UnitMenuRow.VISIT) {
			const house = this.house(mover);

			if (house !== null) {
				// The visit feature takes it from here - it plays what the villager has
				// to say and shuts the door behind the unit.
				this.closeOpenMenu();
				this.events.dispatch("visit:requested", { unitId: mover.getComponent(UnitComponent).read().id, houseId: house.id });
			}

			return;
		}

		if (event.row === UnitMenuRow.TALK) {
			const partner = this.talkPartner(mover);

			if (partner !== null) {
				// The talk feature takes it from here - it looks the conversation up
				// and plays it in the textbox.
				this.closeOpenMenu();
				this.events.dispatch("talk:requested", {
					unitId: mover.getComponent(UnitComponent).read().id,
					partnerId: partner.getComponent(UnitComponent).read().id
				});
			}

			return;
		}

		if (event.row === UnitMenuRow.ITEMS) {
			this.openItemsMenu(mover);
			return;
		}

		if (event.row === UnitMenuRow.TRADE) {
			const [nearest] = this.tradePartners(mover);

			if (nearest !== undefined) {
				// The trade screen takes it from here - it gathers every ally beside
				// the unit and moves the cursor between them.
				this.requestTrade(mover, nearest);
			}

			return;
		}

		if (event.row === UnitMenuRow.WAIT) {
			this.spendMover(mover);
			return;
		}

		mover.removeComponent(PendingMoveComponent);
	}

	/** The forecast was backed out of - the unit is still standing there, so re-open its command menu. */
	private onCombatCancelled(event: CombatCancelledEvent): void {
		const mover = unitById(this.units(), event.attackerId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.openCommandMenu(mover);
		}
	}

	/** The fight happened - spend the attacker the same way "Wait" does (if it is still alive). */
	private onCombatResolved(event: CombatResolvedEvent): void {
		const mover = unitById(this.units(), event.attackerId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.spendMover(mover);
		}
	}

	/**
	 * A conversation finished. Talking is free, like trading - the unit is still
	 * standing there with its turn to spend, so its command menu comes back.
	 */
	private onTalkFinished(event: TalkFinishedEvent): void {
		this.reopenCommandMenu(event.unitId);
	}

	/** The player backed out of choosing who to talk to - nothing happened, so put the menu back. */
	private onTalkCancelled(event: TalkCancelledEvent): void {
		this.reopenCommandMenu(event.unitId);
	}

	/**
	 * The house was called on. Unlike talking, visiting is the unit's action for
	 * the turn, Fire Emblem style - it knocked, it was handed something, it is
	 * done - so it is spent the same way "Wait" spends it.
	 */
	private onVisitFinished(event: VisitFinishedEvent): void {
		const mover = unitById(this.units(), event.unitId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.spendMover(mover);
		}
	}

	/** Nobody was in after all - nothing happened, so put the command menu back. */
	private onVisitCancelled(event: VisitCancelledEvent): void {
		this.reopenCommandMenu(event.unitId);
	}

	/** The staff came down - healing is the unit's action for the turn, so it is spent the way "Wait" spends it. */
	private onStaffResolved(event: StaffResolvedEvent): void {
		this.spendPending(event.unitId);
	}

	/** The player backed out of the staff list or the target choice - nothing happened, so put the menu back. */
	private onStaffCancelled(event: StaffCancelledEvent): void {
		this.reopenCommandMenu(event.unitId);
	}

	/** The door swung open - turning the key is what the unit did this turn, so it is spent. */
	private onDoorOpened(event: DoorOpenedEvent): void {
		this.spendPending(event.unitId);
	}

	/** The chest was opened and its find acknowledged - the unit is spent. */
	private onChestOpened(event: ChestOpenedEvent): void {
		this.spendPending(event.unitId);
	}

	/** The lock was not there to open after all - nothing happened, so put the menu back. */
	private onLockCancelled(event: LockCancelledEvent): void {
		this.reopenCommandMenu(event.unitId);
	}

	/** The stat-gain notice was acknowledged - now the booster counts as used and the unit is spent. */
	private onPopupClosed(event: PopupClosedEvent): void {
		const boosting = this.boosting;

		if (boosting === null || event.popup !== `boost-${boosting}`) {
			return;
		}

		this.boosting = null;
		this.spendPending(boosting);
	}

	/** Spends a unit that is still mid-turn, by id - the shared tail of every command that finishes elsewhere. */
	private spendPending(unitId: string): void {
		const mover = unitById(this.units(), unitId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.spendMover(mover);
		}
	}

	/** Puts a mid-turn unit's command menu back after a free action it did not finish. */
	private reopenCommandMenu(unitId: string): void {
		const mover = unitById(this.units(), unitId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.openCommandMenu(mover);
		}
	}

	/**
	 * The trade screen closed. Trading is a free action - whatever changed hands,
	 * the unit is still standing there with its turn to spend - so its command
	 * menu simply comes back.
	 */
	private onTradeClosed(event: TradeClosedEvent): void {
		const mover = unitById(this.units(), event.unitId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.openCommandMenu(mover);
		}
	}

	/**
	 * Ends the unit's action: spend it and put it down, then report `unit:acted`.
	 * The commands that finish a turn - "Wait", a used item, a resolved fight -
	 * all end here. The free ones (trading, equipping, dropping) never call it.
	 */
	private spendMover(mover: Entity): void {
		const unit = mover.getComponent(UnitComponent);

		unit.update({ ...unit.read(), hasMoved: true });
		mover.removeComponent(PendingMoveComponent);

		this.events.dispatch("unit:acted", { unitId: unit.read().id });
	}

	/** A row of the item-action menu - use / equip / unequip / drop the entry in `actionSlot`, then refresh the pack list. */
	private onItemAction(mover: Entity, action: string): void {
		// MenuSystem drops the submenu once it reports the row; close it here too so
		// the flow is the same when a test drives the events directly.
		this.menuState().closeSubmenu();

		const component = mover.getComponent(UnitComponent);
		const before = component.read();
		const slot = this.actionSlot;
		const entry = before.inventory[slot];

		if (entry === undefined) {
			this.refreshItemsMenu(mover);
			return;
		}

		if (action === UnitMenuRow.USE) {
			const gains = entry.item === null ? NO_BOOST : UnitComponent.boostGains(before, entry.item);
			const after = UnitComponent.useItem(before, slot);

			if (after === before) {
				this.refreshItemsMenu(mover, slot);
				return;
			}

			component.update(after);
			this.events.dispatch("unit:usedItem", { unitId: after.id, itemId: entry.id, healed: after.currentHP - before.currentHP, gains });

			// Using an item is the unit's action for the turn, Fire Emblem style -
			// the pack menu it was chosen from goes with it.
			this.closeOpenMenu();

			// A booster's gains are listed before the unit is spent, the way Fire
			// Emblem lights the stat screen up; a heal just floats its number.
			if (UnitComponent.isAnyBoost(gains)) {
				this.boosting = after.id;
				this.stateManager.getState(PopupState).request(boostPopup(after.id, entry.name, gains));
				this.stateManager.push(PopupState);
				return;
			}

			this.spendMover(mover);
			return;
		}

		if (action === UnitMenuRow.EQUIP) {
			const after = UnitComponent.equip(before, slot);

			if (after !== before) {
				component.update(after);
				this.events.dispatch("unit:equipped", { unitId: after.id, weaponId: entry.id });
			}

			// The readied weapon has moved to the front of the pack.
			this.refreshItemsMenu(mover, 0);
			return;
		}

		if (action === UnitMenuRow.UNEQUIP) {
			const after = UnitComponent.unequip(before);

			if (after !== before) {
				component.update(after);
				this.events.dispatch("unit:unequipped", { unitId: after.id });
			}

			this.refreshItemsMenu(mover, slot);
			return;
		}

		if (action === UnitMenuRow.DROP) {
			const after = UnitComponent.drop(before, slot);

			if (after !== before) {
				component.update(after);
				this.events.dispatch("unit:droppedItem", { unitId: after.id, itemId: entry.id });
			}

			if (after.inventory.length === 0) {
				this.openCommandMenu(mover);
			} else {
				this.refreshItemsMenu(mover, Math.min(slot, after.inventory.length - 1));
			}

			return;
		}

		this.refreshItemsMenu(mover, slot);
	}

	/** Backed out of a menu - the item-action submenu just closes; the items menu drops to the command menu; the command menu reverts the move. */
	private onCommandCancelled(event: MenuCancelledEvent): void {
		if (this.world.entityWith(MovementComponent) === null) {
			return;
		}

		// The items menu underneath stays exactly as it was; just make sure the
		// submenu is gone (MenuSystem already does this in the running game).
		if (event.menu === ITEM_ACTION_MENU) {
			this.menuState().closeSubmenu();
			return;
		}

		const mover = this.pendingMover();

		if (event.menu === ITEMS_MENU) {
			if (mover !== null) {
				this.openCommandMenu(mover);
			}

			return;
		}

		if (event.menu !== COMMAND_MENU) {
			return;
		}

		if (mover === null) {
			return;
		}

		const pending = mover.getComponent(PendingMoveComponent).read();
		const origin = { column: pending.originColumn, row: pending.originRow };

		mover.getComponent(GridPositionComponent).update({ ...origin });
		mover.removeComponent(PendingMoveComponent);

		// Back where the move started - the move system picks it up again from there.
		const data = mover.getComponent(UnitComponent).read();
		this.events.dispatch("unit:returned", { unitId: data.id, column: origin.column, row: origin.row });

		activeCursor(this.world)
			?.getComponent(GridPositionComponent)
			.update({ ...origin });
	}

	/** The unit that has moved but not yet decided what to do - the one every open menu belongs to. */
	private pendingMover(): Entity | null {
		return this.units().find((entity) => entity.hasComponent(PendingMoveComponent)) ?? null;
	}

	/** A unit is mid-walk - every confirm and cancel is ignored until it lands. */
	/** Drops a menu still on top of the stack, so the next one does not stack MenuState on itself. */
	private closeOpenMenu(): void {
		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}
	}

	private units(): Entity[] {
		return unitsInWorld(this.world);
	}

	private menuState(): MenuState {
		return this.stateManager.getState(MenuState);
	}

	private pushMenu(request: MenuRequest): void {
		this.menuState().request(request);
		this.stateManager.push(MenuState);
	}

	private openMenu(request: Omit<MenuRequest, "anchor">, column: number, row: number): void {
		const anchor = tileToScreen(this.world, column, row);

		if (anchor === null) {
			return;
		}

		this.closeOpenMenu();
		this.pushMenu({ ...request, anchor });
	}

	/** Top-left screen pixel of the tile a unit stands on. */
	private tileOnScreen(unit: Entity): { x: number; y: number } | null {
		const position = tileOf(unit);
		return tileToScreen(this.world, position.column, position.row);
	}
}
