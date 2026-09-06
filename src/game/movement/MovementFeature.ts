import { Entity } from "@/core/ecs/Entity";
import { EventSystem } from "@/core/events/EventSystem";
import { UnsubscribeFunction } from "@/core/events/GameEvents";
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuConfirmedEvent, MenuCancelledEvent, TileConfirmedEvent, UnitMovedEvent } from "@/game.events";
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
import { UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { MenuState } from "@/game/ui/states/MenuState";

/** Id of the command menu, echoed by the `ui:menu*` events. */
const COMMAND_MENU = "unit-command";
const COMMAND_MENU_WIDTH = 150;
const WAIT = "Warten";

/**
 * The Fire Emblem move flow, wired to the map's `map:*` events on top of the
 * units the [[UnitsFeature]] deploys:
 *
 *  - Confirm on one of your units picks it up and lights the movement (blue) and
 *    attack (red) tiles; `PathPreviewSystem` traces the shortest route to the
 *    cursor.
 *  - Confirm again on a blue tile walks it there and opens the command menu
 *    beside it. "Warten" spends the unit (it greys out); backing out reverts the
 *    move and re-opens the range.
 *  - Confirm off the range or `map:cancelled` sets it back down without moving.
 *
 * It handles `map:tileConfirmed` above the demo (priority 10) and stops the
 * event once it has consumed a press, so picking a unit up never also opens the
 * tile menu.
 */
export class MovementFeature extends GameFeature {
	@GameCoreService(EventSystem)
	private events!: EventSystem;

	private subscriptions: UnsubscribeFunction[] = [];
	private movement: Entity | null = null;
	private mapId: string | null = null;

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
			this.events.subscribe("ui:menuCancelled", (event) => this.onCommandCancelled(event))
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

			if (unit === null) {
				return;
			}

			const data = unit.getComponent(UnitComponent).read();

			// Enemies, spent units and one mid-move all stay put.
			if (data.faction !== UnitFaction.PLAYER || data.hasMoved || unit.hasComponent(PendingMoveComponent)) {
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

		const anchor = this.tileToScreen(event.toColumn, event.toRow);

		if (anchor === null) {
			return;
		}

		(this.stateManager.getState(MenuState) as MenuState).request({ id: COMMAND_MENU, items: [WAIT], width: COMMAND_MENU_WIDTH, anchor });
		this.stateManager.push(MenuState);
	}

	private onCommand(event: MenuConfirmedEvent): void {
		if (event.menu !== COMMAND_MENU) {
			return;
		}

		const mover = this.units().find((entity) => entity.hasComponent(PendingMoveComponent));

		if (mover === undefined) {
			return;
		}

		if (event.item === WAIT) {
			const unit = mover.getComponent(UnitComponent);
			unit.update({ ...unit.read(), hasMoved: true });
		}

		mover.removeComponent(PendingMoveComponent);
	}

	/** Backed out of the command menu - put the unit back and re-open its range. */
	private onCommandCancelled(event: MenuCancelledEvent): void {
		if (event.menu !== COMMAND_MENU || this.movement === null) {
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
		const attack = MovementSystem.attackable(grid, reachable, data.weapon.minRange, data.weapon.maxRange);

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
