import { Entity } from "@/core/ecs/Entity";
import { EventSystem } from "@/core/events/EventSystem";
import { UnsubscribeFunction } from "@/core/events/GameEvents";
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { i18n } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CombatCancelledEvent, CombatResolvedEvent, MenuConfirmedEvent, MenuCancelledEvent, TileConfirmedEvent, UnitMovedEvent } from "@/game.events";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { idleMovement, MovementComponent } from "@/game/movement/components/MovementComponent";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { WALK_STEP_MS } from "@/game/movement/model/PathWalk";
import { MovementRenderSystem } from "@/game/movement/systems/MovementRenderSystem";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
import { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { dropInventoryItem, equipInventoryItem, healingAmount, isHealingItem, unequipInventoryItem, useHealingItem } from "@/game/units/model/Inventory";
import { InventoryEntry, InventoryKind, UnitData, UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { CombatSystem } from "@/game/combat/systems/CombatSystem";
import { MenuRequest, MenuState } from "@/game/ui/states/MenuState";

/** Menu ids, echoed by the `ui:menu*` events. */
const COMMAND_MENU = "unit-command";
const GLOBAL_MENU = "global-command";
const ITEMS_MENU = "unit-items";
const ITEM_ACTION_MENU = "unit-item-action";
const COMMAND_MENU_WIDTH = 160;
const GLOBAL_MENU_WIDTH = 190;
const ITEMS_MENU_WIDTH = 300;
const ITEM_ACTION_MENU_WIDTH = 190;
/** Gap between the items panel and the action submenu tucked against its right edge. */
const ITEM_ACTION_MENU_GAP = 4;

/** Menu row labels, resolved fresh so a locale switch is picked up. */
const attack = () => i18n("menu.attack");
const wait = () => i18n("menu.wait");
const endTurn = () => i18n("menu.endTurn");
const items = () => i18n("menu.items");
const equip = () => i18n("menu.equip");
const unequip = () => i18n("menu.unequip");
const use = () => i18n("menu.use");
const drop = () => i18n("menu.drop");

/**
 * The Fire Emblem move flow, wired to the map's `map:*` events on top of the
 * units the [[UnitsFeature]] deploys:
 *
 *  - Confirm on one of your units picks it up and lights the movement (blue) and
 *    attack (red) tiles; `PathPreviewSystem` traces the shortest route to the
 *    cursor.
 *  - Confirm again on a blue tile walks it there and opens the command menu
 *    beside it. "Items" opens the unit's pack; a row opens a per-item menu to
 *    use / equip / unequip / drop it (`unit:usedItem` / `unit:equipped` /
 *    `unit:unequipped` / `unit:droppedItem`). "Use" heals the unit off a
 *    vulnerary-style consumable and spends its turn. "Wait" spends the unit (it
 *    greys out, `unit:acted`); backing out reverts the move and re-opens the range.
 *  - Confirm off the range or `map:cancelled` sets it back down without moving.
 *  - Confirm on a tile with nothing to pick up opens the global command menu
 *    ("End Turn" -> `turn:end`) next to the cursor.
 *
 * It handles `map:tileConfirmed` at priority 10 and stops the event once it has
 * consumed a press.
 */
export class MovementFeature extends GameFeature {
	@GameCoreService(EventSystem)
	private events!: EventSystem;

	private subscriptions: UnsubscribeFunction[] = [];
	private movement: Entity | null = null;
	private mapId: string | null = null;
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
		this.subscriptions.push(
			this.events.subscribe("map:ready", (event) => this.open(event.mapId)),
			this.events.subscribe("map:closed", () => this.close()),
			this.events.subscribe("map:tileConfirmed", (event) => this.onConfirm(event), 10),
			this.events.subscribe("map:cancelled", () => this.onCancel(), 10),
			this.events.subscribe("unit:moved", (event) => this.onArrived(event)),
			this.events.subscribe("ui:menuConfirmed", (event) => this.onCommand(event)),
			this.events.subscribe("ui:menuCancelled", (event) => this.onCommandCancelled(event)),
			this.events.subscribe("combat:cancelled", (event) => this.onCombatCancelled(event)),
			this.events.subscribe("combat:resolved", (event) => this.onCombatResolved(event))
		);
	}

	protected onUninstall(): void {
		this.close();

		for (const unsubscribe of this.subscriptions) {
			unsubscribe();
		}

		this.subscriptions = [];
	}

	private open(mapId: string): void {
		this.close();
		this.mapId = mapId;

		this.movement = this.world.createEntity();
		this.movement.addComponent(MovementComponent, idleMovement());
	}

	private close(): void {
		if (this.movement) {
			this.world.unregisterEntity(this.movement);
			this.movement = null;
		}

		this.mapId = null;
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
				this.openMenu({ id: GLOBAL_MENU, items: [endTurn()], width: GLOBAL_MENU_WIDTH }, event.column, event.row);
				event.stopPropagation();
				return;
			}

			const position = unit.getComponent(GridPositionComponent).read();
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
			const origin = { column: state.originColumn, row: state.originRow };
			const target = { column: event.column, row: event.row };
			const blocked = MovementSystem.blockedTiles(UnitSystem.locations(units), state.unitId);
			const route = MovementSystem.path(grid, origin, target, mover.getComponent(UnitComponent).read().movement, blocked);

			// The logical tile jumps to the target now - occupancy and blocking stay
			// correct - and the token walks the route to catch up. The command menu
			// opens on `unit:moved`, once the walk lands.
			mover.getComponent(GridPositionComponent).update(target);
			mover.addComponent(PendingMoveComponent, { originColumn: origin.column, originRow: origin.row });

			const walk = route.length >= 2 ? route : [origin, target];
			mover.addComponent(WalkComponent, { path: walk, elapsed: 0, duration: (walk.length - 1) * WALK_STEP_MS });
		} else {
			this.events.dispatch("unit:deselected", { unitId: state.unitId });
		}

		component.update(idleMovement());
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

	/** The unit command menu: "Attack" (with a target in reach), "Items" (with something to show), then "Wait". */
	private openCommandMenu(mover: Entity): void {
		const data = mover.getComponent(UnitComponent).read();
		const position = mover.getComponent(GridPositionComponent).read();

		const rows: string[] = [];

		if (this.attackTarget(mover) !== null) {
			rows.push(attack());
		}

		if (data.inventory.length > 0) {
			rows.push(items());
		}

		rows.push(wait());

		this.openMenu({ id: COMMAND_MENU, items: rows, width: COMMAND_MENU_WIDTH }, position.column, position.row);
	}

	/** The enemy this unit would attack from where it stands - the nearest one something in its pack reaches, or null. */
	private attackTarget(mover: Entity): Entity | null {
		const data = mover.getComponent(UnitComponent).read();
		const from = mover.getComponent(GridPositionComponent).read();

		let best: { entity: Entity; distance: number } | null = null;

		for (const enemy of this.enemiesOf(data.faction)) {
			const at = enemy.getComponent(GridPositionComponent).read();
			const distance = CombatSystem.distance(from, at);

			if (CombatSystem.weaponsReaching(data, distance).length === 0) {
				continue;
			}

			if (best === null || distance < best.distance) {
				best = { entity: enemy, distance };
			}
		}

		return best?.entity ?? null;
	}

	private enemiesOf(faction: UnitData["faction"]): Entity[] {
		return this.units().filter((entity) => entity.getComponent(UnitComponent).read().faction !== faction);
	}

	/** The `MenuRequest` for the unit's pack: a badged, right-aligned-durability list that stays open for its submenu. */
	private itemsRequest(mover: Entity, selectedIndex?: number): MenuRequest {
		const data = mover.getComponent(UnitComponent).read();
		const position = mover.getComponent(GridPositionComponent).read();
		const cursor =
			selectedIndex ??
			Math.max(
				0,
				data.inventory.findIndex((entry) => entry.equipped)
			);

		return {
			id: ITEMS_MENU,
			title: items(),
			items: data.inventory.map((entry) => entry.name),
			badges: data.inventory.map((entry) => (entry.equipped ? i18n("menu.equipped") : "")),
			values: data.inventory.map((entry) => `${entry.uses}/${entry.maxUses}`),
			width: ITEMS_MENU_WIDTH,
			selectedIndex: cursor,
			keepOpen: true,
			anchor: this.tileToScreen(position.column, position.row) ?? undefined
		};
	}

	/** The unit's pack: every carried weapon and item, the readied weapon badged. Replaces the command menu. */
	private openItemsMenu(mover: Entity, selectedIndex?: number): void {
		const request = this.itemsRequest(mover, selectedIndex);

		if (request.anchor === undefined) {
			return;
		}

		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}

		(this.stateManager.getState(MenuState) as MenuState).request(request);
		this.stateManager.push(MenuState);
	}

	/** Rebuilds the still-open items menu after the pack changed (badge moved, item dropped, ...). */
	private refreshItemsMenu(mover: Entity, selectedIndex?: number): void {
		(this.stateManager.getState(MenuState) as MenuState).updateMenu(this.itemsRequest(mover, selectedIndex));
	}

	/**
	 * The per-item menu, Fire Emblem style: "Equip" or "Unequip" for a weapon
	 * the class can wield, then "Drop" for anything. It is layered on top of the
	 * items menu, which stays on screen; `actionSlot` remembers which pack entry
	 * it acts on.
	 */
	private openItemActionMenu(mover: Entity, index: number): void {
		const data = mover.getComponent(UnitComponent).read();
		const entry = data.inventory[index];
		const state = this.stateManager.getState(MenuState) as MenuState;
		const itemsMenu = state.getMenu();

		if (entry === undefined || itemsMenu === null) {
			return;
		}

		this.actionSlot = index;

		// Just right of the items panel, top edges aligned.
		const panel = itemsMenu.getComponent(TransformComponent).read();
		const position = { x: panel.x + ITEMS_MENU_WIDTH + ITEM_ACTION_MENU_GAP, y: panel.y };

		const canUse = entry.item !== null && isHealingItem(entry) && healingAmount(data, entry.item) > 0;

		state.openSubmenu({ id: ITEM_ACTION_MENU, title: entry.name, items: itemActionRows(entry, canUse), width: ITEM_ACTION_MENU_WIDTH, position });
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

		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}

		(this.stateManager.getState(MenuState) as MenuState).request({ ...request, anchor });
		this.stateManager.push(MenuState);
	}

	private onCommand(event: MenuConfirmedEvent): void {
		if (event.menu === GLOBAL_MENU) {
			if (event.item === endTurn()) {
				this.events.dispatch("turn:end", {});
			}
			return;
		}

		if (event.menu === ITEMS_MENU || event.menu === ITEM_ACTION_MENU) {
			const holder = this.units().find((entity) => entity.hasComponent(PendingMoveComponent));

			if (holder !== undefined) {
				if (event.menu === ITEMS_MENU) {
					this.openItemActionMenu(holder, event.index);
				} else {
					this.onItemAction(holder, event.item);
				}
			}

			return;
		}

		if (event.menu !== COMMAND_MENU) {
			return;
		}

		const mover = this.units().find((entity) => entity.hasComponent(PendingMoveComponent));

		if (mover === undefined) {
			return;
		}

		if (event.item === attack()) {
			const target = this.attackTarget(mover);

			if (target !== null) {
				// The command menu is already gone (MenuSystem popped it); a test that
				// drives the events by hand still has it on top, so drop it.
				if (this.stateManager.peek() instanceof MenuState) {
					this.stateManager.pop();
				}

				this.events.dispatch("combat:requested", {
					attackerId: mover.getComponent(UnitComponent).read().id,
					defenderId: target.getComponent(UnitComponent).read().id
				});
			}

			return;
		}

		if (event.item === items()) {
			this.openItemsMenu(mover);
			return;
		}

		if (event.item === wait()) {
			const unit = mover.getComponent(UnitComponent);
			unit.update({ ...unit.read(), hasMoved: true });
			this.events.dispatch("unit:acted", { unitId: unit.read().id });
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

		if (mover === null || !mover.hasComponent(PendingMoveComponent)) {
			return;
		}

		const unit = mover.getComponent(UnitComponent);
		unit.update({ ...unit.read(), hasMoved: true });
		mover.removeComponent(PendingMoveComponent);
		this.events.dispatch("unit:acted", { unitId: event.attackerId });
	}

	/** Ends the unit's action the way "Wait" does: spend it, drop any menu still open, report `unit:acted`. */
	private spendMover(mover: Entity): void {
		const unit = mover.getComponent(UnitComponent);

		unit.update({ ...unit.read(), hasMoved: true });
		mover.removeComponent(PendingMoveComponent);

		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}

		this.events.dispatch("unit:acted", { unitId: unit.read().id });
	}

	/** A row of the item-action menu - use / equip / unequip / drop the entry in `actionSlot`, then refresh the pack list. */
	private onItemAction(mover: Entity, choice: string): void {
		// MenuSystem drops the submenu once it reports the row; close it here too so
		// the flow is the same when a test drives the events directly.
		(this.stateManager.getState(MenuState) as MenuState).closeSubmenu();

		const component = mover.getComponent(UnitComponent);
		const before = component.read();
		const slot = this.actionSlot;
		const entry = before.inventory[slot];

		if (entry === undefined) {
			this.refreshItemsMenu(mover);
			return;
		}

		if (choice === use()) {
			const after = useHealingItem(before, slot);

			if (after === before) {
				this.refreshItemsMenu(mover, slot);
				return;
			}

			component.update(after);
			this.events.dispatch("unit:usedItem", { unitId: after.id, itemId: entry.id, healed: after.currentHP - before.currentHP });

			// Using an item is the unit's action for the turn, Fire Emblem style.
			this.spendMover(mover);
			return;
		}

		if (choice === equip()) {
			const after = equipInventoryItem(before, slot);

			if (after !== before) {
				component.update(after);
				this.events.dispatch("unit:equipped", { unitId: after.id, weaponId: entry.id });
			}

			// The readied weapon has moved to the front of the pack.
			this.refreshItemsMenu(mover, 0);
			return;
		}

		if (choice === unequip()) {
			const after = unequipInventoryItem(before);

			if (after !== before) {
				component.update(after);
				this.events.dispatch("unit:unequipped", { unitId: after.id });
			}

			this.refreshItemsMenu(mover, slot);
			return;
		}

		if (choice === drop()) {
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
			(this.stateManager.getState(MenuState) as MenuState).closeSubmenu();
			return;
		}

		if (event.menu === ITEMS_MENU) {
			const mover = this.units().find((entity) => entity.hasComponent(PendingMoveComponent));

			if (mover !== undefined) {
				this.openCommandMenu(mover);
			}

			return;
		}

		if (event.menu !== COMMAND_MENU) {
			return;
		}

		const grid = this.grid();
		const mover = this.units().find((entity) => entity.hasComponent(PendingMoveComponent));

		if (grid === null || mover === undefined) {
			return;
		}

		const pending = mover.getComponent(PendingMoveComponent).read();
		const origin = { column: pending.originColumn, row: pending.originRow };

		mover.getComponent(GridPositionComponent).update({ ...origin });
		mover.removeComponent(PendingMoveComponent);

		const data = mover.getComponent(UnitComponent).read();
		this.select(data.id, origin.column, origin.row, grid, this.units());

		const cursor = this.world.getEntities().find((entity) => entity.hasComponent(CursorComponent));
		cursor?.getComponent(GridPositionComponent).update({ ...origin });
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
		return this.world.getEntities().filter((entity) => entity.hasComponent(UnitComponent));
	}

	/** A unit is mid-walk - every confirm and cancel is ignored until it lands. */
	private isWalking(): boolean {
		return this.world.getEntities().some((entity) => entity.hasComponent(WalkComponent));
	}

	private grid() {
		if (this.mapId === null || !this.world.hasEntity(this.mapId)) {
			return null;
		}

		const map = this.world.getEntity(this.mapId);

		return map.hasComponent(GridComponent) ? map.getComponent(GridComponent).read() : null;
	}

	/** Top-left screen pixel of a map tile - the map transform plus the tile offset. */
	private tileToScreen(column: number, row: number): { x: number; y: number } | null {
		if (this.mapId === null || !this.world.hasEntity(this.mapId)) {
			return null;
		}

		const map = this.world.getEntity(this.mapId);

		if (!map.hasComponent(TransformComponent) || !map.hasComponent(GridComponent)) {
			return null;
		}

		const transform = map.getComponent(TransformComponent).read();
		const { cellSize } = map.getComponent(GridComponent).read();

		return { x: transform.x + column * cellSize, y: transform.y + row * cellSize };
	}
}

/**
 * The item-action menu rows for one pack entry: "Use" for a healing item that
 * would restore HP, "Equip"/"Unequip" for a wieldable weapon, "Drop" for
 * anything.
 */
function itemActionRows(entry: InventoryEntry, canUse: boolean): string[] {
	const rows: string[] = [];

	if (canUse) {
		rows.push(use());
	}

	if (entry.kind === InventoryKind.WEAPON && entry.equippable) {
		rows.push(entry.equipped ? unequip() : equip());
	}

	rows.push(drop());

	return rows;
}
