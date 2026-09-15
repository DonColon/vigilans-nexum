import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { Entity } from "@/core/ecs/Entity";
import { TileConfirmedEvent, UnitReturnedEvent } from "@/game.events";
import { GridData } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { idleMovement, MovementComponent } from "@/game/movement/components/MovementComponent";
import { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { WALK_STEP_MS } from "@/game/movement/view/PathWalk";
import { globalCommandRequest } from "@/game/movement/view/UnitMenus";
import { blockedTiles, occupiedTiles, reachableTiles, movementPath, attackableTiles, hasTile } from "@/game/movement/rules/Pathfinding";
import { isStaff } from "@/game/units/content/UnitCatalog";
import { UnitComponent, UnitFaction } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitAt, unitById, unitLocations, tileOf } from "@/game/units/rules/UnitLookup";
import { MenuRequest, MenuState } from "@/game/ui/states/MenuState";
import { activeGrid, tileToScreen } from "@/game/map/rules/ActiveMap";

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
 *
 * Only some of those commands finish the unit's turn: "Wait", a used item, a
 * resolved fight, a raised staff, an opened lock and a visited house all spend
 * it (`unit:acted`, the token greys out). Talking, trading, equipping,
 * unequipping and dropping are free - the command menu comes back and the unit
 * still has its action.
 *  - Confirm off the range or `map:cancelled` sets it back down without moving.
 *  - Confirm on a tile with nothing to pick up opens the global command menu
 *    next to the cursor: "Units" opens the army list (`roster:requested`),
 *    "Options" the settings screen (`options:requested`), "End Turn" ends the
 *    turn (`turn:end`).
 *
 * The menus themselves are built in `view/UnitMenus`; this feature only decides
 * when one opens and what a chosen row does.
 *
 * It handles `map:tileConfirmed` at priority 10 and stops the event once it has
 * consumed a press.
 */
export class UnitMoveSystem extends ReactiveSystem {
	private movement: Entity | null = null;

	public initialize(): this {
		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("map:tileConfirmed", (event) => this.onConfirm(event), 10);
		this.subscribe("map:cancelled", () => this.onCancel(), 10);
		this.subscribe("unit:returned", (event) => this.onReturned(event));

		return this;
	}

	public dispose(): void {
		this.close();
		super.dispose();
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

		const grid = activeGrid(this.world);

		if (grid === null) {
			return;
		}

		const component = this.movement.getComponent(MovementComponent);
		const state = component.read();
		const units = this.units();

		if (state.unitId.length === 0) {
			const unit = unitAt(units, event.column, event.row);
			const data = unit?.getComponent(UnitComponent).read();

			// Confirm on nothing to pick up (empty tile, an enemy, a spent or
			// mid-move unit) opens the global command menu instead.
			if (unit === null || data === undefined || data.faction !== UnitFaction.PLAYER || data.hasMoved || unit.hasComponent(PendingMoveComponent)) {
				this.openMenu(globalCommandRequest(), event.column, event.row);
				event.stopPropagation();
				return;
			}

			const position = tileOf(unit);
			this.select(data.id, position.column, position.row, grid, units);
			event.stopPropagation();
			return;
		}

		// A unit is up; every confirm now belongs to the move flow.
		event.stopPropagation();

		const mover = unitById(units, state.unitId);

		if (mover === null) {
			component.update(idleMovement());
			return;
		}

		const occupant = unitAt(units, event.column, event.row);
		const canMove = hasTile(state.movement, event.column, event.row) && (occupant === null || occupant === mover);

		if (canMove) {
			this.walk(mover, { column: state.originColumn, row: state.originRow }, { column: event.column, row: event.row }, grid, units);
		} else {
			this.events.dispatch("unit:deselected", { unitId: state.unitId });
		}

		component.update(idleMovement());
	}

	private walk(mover: Entity, origin: { column: number; row: number }, target: { column: number; row: number }, grid: GridData, units: Entity[]): void {
		const data = mover.getComponent(UnitComponent).read();
		const blocked = blockedTiles(unitLocations(units), data);
		const route = movementPath(grid, origin, target, data.stats.movement, blocked);

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

	private openMenu(request: Omit<MenuRequest, "anchor">, column: number, row: number): void {
		const anchor = tileToScreen(this.world, column, row);

		if (anchor === null) {
			return;
		}

		if (this.stateManager.peek() instanceof MenuState) {
			this.stateManager.pop();
		}

		this.pushMenu({ ...request, anchor });
	}

	/** A cancelled command menu put the unit back where its move started - pick it up again from there. */
	private onReturned(event: UnitReturnedEvent): void {
		const grid = activeGrid(this.world);

		if (grid !== null) {
			this.select(event.unitId, event.column, event.row, grid, this.units());
		}
	}

	private select(unitId: string, column: number, row: number, grid: GridData, units: Entity[]): void {
		if (this.movement === null) {
			return;
		}

		const unit = unitById(units, unitId);

		if (unit === null) {
			return;
		}

		const data = unit.getComponent(UnitComponent).read();
		const locations = unitLocations(units);
		const blocked = blockedTiles(locations, data);
		const occupied = occupiedTiles(locations, unitId);
		const reachable = reachableTiles(grid, { column, row }, data.stats.movement, blocked, occupied);
		// A readied staff lights no red tiles - it reaches allies, not enemies.
		const attack = data.weapon !== null && !isStaff(data.weapon) ? attackableTiles(grid, reachable, data.weapon.minRange, data.weapon.maxRange) : [];

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
		return unitsInWorld(this.world);
	}

	private isWalking(): boolean {
		return this.world.getEntities().some((entity) => entity.hasComponent(WalkComponent));
	}

	private menuState(): MenuState {
		return this.stateManager.getState(MenuState);
	}

	private pushMenu(request: MenuRequest): void {
		this.menuState().request(request);
		this.stateManager.push(MenuState);
	}
}
