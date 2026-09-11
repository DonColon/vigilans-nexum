import { Entity } from "@/core/ecs/Entity";
import { GameFeatureConfig } from "@/core/GameFeature";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import {
	CombatCancelledEvent,
	CombatResolvedEvent,
	MenuConfirmedEvent,
	MenuCancelledEvent,
	TalkCancelledEvent,
	TalkFinishedEvent,
	TileConfirmedEvent,
	TradeClosedEvent,
	UnitMovedEvent,
	VisitCancelledEvent,
	VisitFinishedEvent
} from "@/game.events";
import { BattleMapFeature } from "@/game/map/BattleMapFeature";
import { GridData } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { idleMovement, MovementComponent } from "@/game/movement/components/MovementComponent";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { WALK_STEP_MS } from "@/game/movement/model/PathWalk";
import {
	COMMAND_MENU,
	GLOBAL_MENU,
	ITEMS_MENU,
	ITEM_ACTION_MENU,
	ITEMS_MENU_WIDTH,
	ITEM_ACTION_MENU_GAP,
	UnitMenuRow,
	globalCommandRequest,
	itemActionRequest,
	itemsRequest,
	unitCommandRequest
} from "@/game/movement/model/UnitMenus";
import { MovementRenderSystem } from "@/game/movement/systems/MovementRenderSystem";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { dropInventoryItem, equipInventoryItem, unequipInventoryItem, useHealingItem } from "@/game/units/model/Inventory";
import { UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { CombatSystem } from "@/game/combat/systems/CombatSystem";
import { TalkComponent } from "@/game/talk/components/TalkComponent";
import { TalkSystem } from "@/game/talk/systems/TalkSystem";
import { MenuRequest, MenuState } from "@/game/ui/states/MenuState";
import { VisitComponent } from "@/game/visit/components/VisitComponent";
import { House } from "@/game/visit/model/Houses";
import { VisitSystem } from "@/game/visit/systems/VisitSystem";

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
 *    vulnerary-style consumable and spends its turn. "Wait" spends the unit (it
 *    greys out, `unit:acted`); backing out reverts the move and re-opens the range.
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
 *
 * Only some of those commands finish the unit's turn: "Wait", a used item, a
 * resolved fight and a visited house all spend it (`unit:acted`, the token greys
 * out). Talking, trading, equipping, unequipping and dropping are free - the
 * command menu comes back and the unit still has its action.
 *  - Confirm off the range or `map:cancelled` sets it back down without moving.
 *  - Confirm on a tile with nothing to pick up opens the global command menu
 *    next to the cursor: "Units" opens the army list (`roster:requested`), "End
 *    Turn" ends the turn (`turn:end`).
 *
 * The menus themselves are built in `model/UnitMenus`; this feature only decides
 * when one opens and what a chosen row does.
 *
 * It handles `map:tileConfirmed` at priority 10 and stops the event once it has
 * consumed a press.
 */
export class MovementFeature extends BattleMapFeature {
	private movement: Entity | null = null;
	/** Pack slot the open item-action menu (equip / unequip / drop) works on. */
	private actionSlot = -1;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [MovementComponent, WalkComponent, PendingMoveComponent],
			systems: [
				// Below UnitRenderSystem (17) on the background layer: overlay first,
				// units on top.
				{ system: MovementRenderSystem, priority: 16 },
				// After CursorSystem (10) so the path tracks this frame's cursor tile.
				{ system: PathPreviewSystem, priority: 12 },
				// Runs the walk clock; order among the update systems does not matter.
				{ system: UnitWalkSystem, priority: 8 }
			],
			...config
		});
	}

	protected onInstall(): void {
		super.onInstall();

		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("map:tileConfirmed", (event) => this.onConfirm(event), 10);
		this.subscribe("map:cancelled", () => this.onCancel(), 10);
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
	}

	protected onUninstall(): void {
		super.onUninstall();

		this.close();
	}

	private open(): void {
		this.close();

		this.movement = this.world.createEntity();
		this.movement.addComponent(MovementComponent, idleMovement());
	}

	private close(): void {
		if (this.movement) {
			this.world.unregisterEntity(this.movement);
			this.movement = null;
		}
	}

	private onConfirm(event: TileConfirmedEvent): void {
		if (this.movement === null) {
			return;
		}

		// Input is locked while a unit walks - swallow the press so nothing else
		// (the demo tile menu) reacts to it either.
		if (this.isWalking()) {
			event.stopPropagation();
			return;
		}

		const grid = this.grid();

		if (grid === null) {
			return;
		}

		const component = this.movement.getComponent(MovementComponent);
		const state = component.read();
		const units = this.units();

		if (state.unitId.length === 0) {
			const unit = UnitSystem.unitAt(units, event.column, event.row);
			const data = unit?.getComponent(UnitComponent).read();

			// Confirm on nothing to pick up (empty tile, an enemy, a spent or
			// mid-move unit) opens the global command menu instead.
			if (unit === null || data === undefined || data.faction !== UnitFaction.PLAYER || data.hasMoved || unit.hasComponent(PendingMoveComponent)) {
				this.openMenu(globalCommandRequest(), event.column, event.row);
				event.stopPropagation();
				return;
			}

			const position = UnitSystem.tileOf(unit);
			this.select(data.id, position.column, position.row, grid, units);
			event.stopPropagation();
			return;
		}

		// A unit is up; every confirm now belongs to the move flow.
		event.stopPropagation();

		const mover = UnitSystem.byId(units, state.unitId);

		if (mover === null) {
			component.update(idleMovement());
			return;
		}

		const occupant = UnitSystem.unitAt(units, event.column, event.row);
		const canMove = MovementSystem.contains(state.movement, event.column, event.row) && (occupant === null || occupant === mover);

		if (canMove) {
			this.walk(mover, { column: state.originColumn, row: state.originRow }, { column: event.column, row: event.row }, grid, units);
		} else {
			this.events.dispatch("unit:deselected", { unitId: state.unitId });
		}

		component.update(idleMovement());
	}

	/**
	 * Sends the unit off along the shortest route to `target`. The logical tile
	 * jumps to the target now - occupancy and blocking stay correct - and the
	 * token walks the route to catch up. The command menu opens on `unit:moved`,
	 * once the walk lands.
	 */
	private walk(mover: Entity, origin: { column: number; row: number }, target: { column: number; row: number }, grid: GridData, units: Entity[]): void {
		const data = mover.getComponent(UnitComponent).read();
		const blocked = MovementSystem.blockedTiles(UnitSystem.locations(units), data.id);
		const route = MovementSystem.path(grid, origin, target, data.movement, blocked);

		mover.getComponent(GridPositionComponent).update(target);
		mover.addComponent(PendingMoveComponent, { originColumn: origin.column, originRow: origin.row });

		const path = route.length >= 2 ? route : [origin, target];
		mover.addComponent(WalkComponent, { path, elapsed: 0, duration: (path.length - 1) * WALK_STEP_MS });
	}

	private onCancel(): void {
		if (this.movement === null || this.isWalking()) {
			return;
		}

		const component = this.movement.getComponent(MovementComponent);
		const state = component.read();

		if (state.unitId.length === 0) {
			return;
		}

		this.events.dispatch("unit:deselected", { unitId: state.unitId });
		component.update(idleMovement());
	}

	/** The walk landed - open the command menu tucked against the unit. */
	private onArrived(event: UnitMovedEvent): void {
		const mover = UnitSystem.byId(this.units(), event.unitId);

		if (mover === null || !mover.hasComponent(PendingMoveComponent)) {
			return;
		}

		this.openCommandMenu(mover);
	}

	/** The unit command menu: "Attack" (with a target in reach), "Talk" (with something left to say), "Items" (with something to show), "Trade" (with an ally beside it), then "Wait". */
	private openCommandMenu(mover: Entity): void {
		const data = mover.getComponent(UnitComponent).read();
		const position = UnitSystem.tileOf(mover);

		const commands = {
			canAttack: this.attackTargets(mover).length > 0,
			canVisit: this.house(mover) !== null,
			canTalk: this.talkPartner(mover) !== null,
			canTrade: this.tradePartners(mover).length > 0
		};

		this.openMenu(unitCommandRequest(data, commands), position.column, position.row);
	}

	/**
	 * The unit beside this one it still has a conversation with, or null. The
	 * conversations are the talk feature's, but the lookup over them is pure - the
	 * same way "Attack" asks CombatSystem what is in reach.
	 */
	private talkPartner(mover: Entity): Entity | null {
		const talk = TalkSystem.inWorld(this.world);

		if (talk === null) {
			return null;
		}

		return TalkSystem.available(talk.getComponent(TalkComponent).read(), this.units(), mover)?.partner ?? null;
	}

	/**
	 * The house this unit is standing beside and could still knock at, or null. The
	 * houses are the visit feature's, but the lookup over them is pure - the same
	 * way "Attack" asks CombatSystem what is in reach.
	 */
	private house(mover: Entity): House | null {
		const visit = VisitSystem.inWorld(this.world);

		if (visit === null) {
			return null;
		}

		return VisitSystem.available(visit.getComponent(VisitComponent).read(), mover);
	}

	/** Every ally standing next to this unit - the ones it could trade packs with. */
	private tradePartners(mover: Entity): Entity[] {
		return UnitSystem.alliesBeside(this.units(), mover);
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
		const enemies = UnitSystem.enemiesOf(this.units(), data.faction);

		return CombatSystem.targetsInReach(data, UnitSystem.tileOf(mover), enemies, UnitSystem.tileOf);
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
	private openMenu(request: Omit<MenuRequest, "anchor">, column: number, row: number): void {
		const anchor = this.tileToScreen(column, row);

		if (anchor === null) {
			return;
		}

		this.closeOpenMenu();
		this.pushMenu({ ...request, anchor });
	}

	private onCommand(event: MenuConfirmedEvent): void {
		if (event.menu === GLOBAL_MENU) {
			if (event.row === UnitMenuRow.UNITS) {
				// The roster feature takes it from here - it gathers the army and puts
				// the list up. Nothing about the map changes.
				this.events.dispatch("roster:requested", {});
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

		if (event.row === UnitMenuRow.ATTACK) {
			const [nearest] = this.attackTargets(mover);

			if (nearest !== undefined) {
				// The forecast takes it from here - it gathers every enemy in reach
				// and moves the cursor between them.
				this.requestCombat(mover, nearest);
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
		const mover = UnitSystem.byId(this.units(), event.attackerId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.openCommandMenu(mover);
		}
	}

	/** The fight happened - spend the attacker the same way "Wait" does (if it is still alive). */
	private onCombatResolved(event: CombatResolvedEvent): void {
		const mover = UnitSystem.byId(this.units(), event.attackerId);

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
		const mover = UnitSystem.byId(this.units(), event.unitId);

		if (mover !== null && mover.hasComponent(PendingMoveComponent)) {
			this.spendMover(mover);
		}
	}

	/** Nobody was in after all - nothing happened, so put the command menu back. */
	private onVisitCancelled(event: VisitCancelledEvent): void {
		this.reopenCommandMenu(event.unitId);
	}

	/** Puts a mid-turn unit's command menu back after a free action it did not finish. */
	private reopenCommandMenu(unitId: string): void {
		const mover = UnitSystem.byId(this.units(), unitId);

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
		const mover = UnitSystem.byId(this.units(), event.unitId);

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
			const after = useHealingItem(before, slot);

			if (after === before) {
				this.refreshItemsMenu(mover, slot);
				return;
			}

			component.update(after);
			this.events.dispatch("unit:usedItem", { unitId: after.id, itemId: entry.id, healed: after.currentHP - before.currentHP });

			// Using an item is the unit's action for the turn, Fire Emblem style -
			// the pack menu it was chosen from goes with it.
			this.closeOpenMenu();
			this.spendMover(mover);
			return;
		}

		if (action === UnitMenuRow.EQUIP) {
			const after = equipInventoryItem(before, slot);

			if (after !== before) {
				component.update(after);
				this.events.dispatch("unit:equipped", { unitId: after.id, weaponId: entry.id });
			}

			// The readied weapon has moved to the front of the pack.
			this.refreshItemsMenu(mover, 0);
			return;
		}

		if (action === UnitMenuRow.UNEQUIP) {
			const after = unequipInventoryItem(before);

			if (after !== before) {
				component.update(after);
				this.events.dispatch("unit:unequipped", { unitId: after.id });
			}

			this.refreshItemsMenu(mover, slot);
			return;
		}

		if (action === UnitMenuRow.DROP) {
			const after = dropInventoryItem(before, slot);

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
		if (this.movement === null) {
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

		const grid = this.grid();

		if (grid === null || mover === null) {
			return;
		}

		const pending = mover.getComponent(PendingMoveComponent).read();
		const origin = { column: pending.originColumn, row: pending.originRow };

		mover.getComponent(GridPositionComponent).update({ ...origin });
		mover.removeComponent(PendingMoveComponent);

		const data = mover.getComponent(UnitComponent).read();
		this.select(data.id, origin.column, origin.row, grid, this.units());

		this.cursor()
			?.getComponent(GridPositionComponent)
			.update({ ...origin });
	}

	/** Picks a unit up: works out its range from `column, row` and lights the overlay. */
	private select(unitId: string, column: number, row: number, grid: GridData, units: Entity[]): void {
		if (this.movement === null) {
			return;
		}

		const unit = UnitSystem.byId(units, unitId);

		if (unit === null) {
			return;
		}

		const data = unit.getComponent(UnitComponent).read();
		const blocked = MovementSystem.blockedTiles(UnitSystem.locations(units), unitId);
		const reachable = MovementSystem.reachable(grid, { column, row }, data.movement, blocked);
		const attack = data.weapon !== null ? MovementSystem.attackable(grid, reachable, data.weapon.minRange, data.weapon.maxRange) : [];

		this.movement.getComponent(MovementComponent).update({
			unitId,
			originColumn: column,
			originRow: row,
			movement: reachable.map((tile) => ({ column: tile.column, row: tile.row })),
			attack,
			path: []
		});

		this.events.dispatch("unit:selected", { unitId, column, row });
	}

	private units(): Entity[] {
		return UnitSystem.inWorld(this.world);
	}

	/** The unit that has moved but not yet decided what to do - the one every open menu belongs to. */
	private pendingMover(): Entity | null {
		return this.units().find((entity) => entity.hasComponent(PendingMoveComponent)) ?? null;
	}

	/** A unit is mid-walk - every confirm and cancel is ignored until it lands. */
	private isWalking(): boolean {
		return this.world.getEntities().some((entity) => entity.hasComponent(WalkComponent));
	}

	private menuState(): MenuState {
		return this.stateManager.getState(MenuState);
	}

	/** Drops a menu still on top of the stack, so the next one does not stack MenuState on itself. */
	private closeOpenMenu(): void {
		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}
	}

	private pushMenu(request: MenuRequest): void {
		this.menuState().request(request);
		this.stateManager.push(MenuState);
	}

	/** Top-left screen pixel of the tile a unit stands on. */
	private tileOnScreen(unit: Entity): { x: number; y: number } | null {
		const position = UnitSystem.tileOf(unit);
		return this.tileToScreen(position.column, position.row);
	}
}
