import { Entity } from "@/core/ecs/Entity";
import { EventSystem } from "@/core/events/EventSystem";
import { UnsubscribeFunction } from "@/core/events/GameEvents";
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { GameCoreService } from "@/core/service/GameCoreService";
import { TileConfirmedEvent } from "@/game.events";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { idleMovement, MovementComponent } from "@/game/movement/components/MovementComponent";
import { MovementRenderSystem } from "@/game/movement/systems/MovementRenderSystem";
import { MovementSystem } from "@/game/movement/systems/MovementSystem";
import { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitFaction } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * The Fire Emblem move flow, wired to the map's `map:*` events on top of the
 * units the [[UnitsFeature]] deploys:
 *
 *  - Confirm on one of your units picks it up and lights the movement (blue) and
 *    attack (red) tiles; `PathPreviewSystem` then traces the shortest route to
 *    the cursor with the tilesheet's arrow sprites.
 *  - Confirm again on a blue tile walks it there; confirm off the range or
 *    `map:cancelled` sets it back down on its origin tile.
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
			components: [MovementComponent],
			systems: [
				// Below UnitRenderSystem (17) on the background layer: overlay first,
				// units on top.
				{ system: MovementRenderSystem, priority: 16 },
				// After CursorSystem (10) so the path tracks this frame's cursor tile.
				{ system: PathPreviewSystem, priority: 12 }
			],
			...config
		});
	}

	protected onInstall(): void {
		this.subscriptions.push(
			this.events.subscribe("map:ready", (event) => this.open(event.mapId)),
			this.events.subscribe("map:closed", () => this.close()),
			this.events.subscribe("map:tileConfirmed", (event) => this.onConfirm(event), 10),
			this.events.subscribe("map:cancelled", () => this.onCancel(), 10)
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

			if (data.faction !== UnitFaction.PLAYER) {
				return;
			}

			const position = unit.getComponent(GridPositionComponent).read();
			const blocked = MovementSystem.blockedTiles(UnitSystem.locations(units), data.id);
			const reachable = MovementSystem.reachable(grid, position, data.movement, blocked);
			const attack = MovementSystem.attackable(grid, reachable, data.weapon.minRange, data.weapon.maxRange);

			component.update({
				unitId: data.id,
				originColumn: position.column,
				originRow: position.row,
				movement: reachable.map((tile) => ({ column: tile.column, row: tile.row })),
				attack,
				path: []
			});

			this.events.dispatch("unit:selected", { unitId: data.id, column: position.column, row: position.row });
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
			mover.getComponent(GridPositionComponent).update({ column: event.column, row: event.row });

			const unitComponent = mover.getComponent(UnitComponent);
			unitComponent.update({ ...unitComponent.read(), hasMoved: true });

			this.events.dispatch("unit:moved", {
				unitId: state.unitId,
				fromColumn: state.originColumn,
				fromRow: state.originRow,
				toColumn: event.column,
				toRow: event.row
			});
		} else {
			this.events.dispatch("unit:deselected", { unitId: state.unitId });
		}

		component.update(idleMovement());
	}

	private onCancel(): void {
		if (this.movement === null) {
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

	private units(): Entity[] {
		return this.world.getEntities().filter((entity) => entity.hasComponent(UnitComponent));
	}

	private grid() {
		if (this.mapId === null || !this.world.hasEntity(this.mapId)) {
			return null;
		}

		const map = this.world.getEntity(this.mapId);

		return map.hasComponent(GridComponent) ? map.getComponent(GridComponent).read() : null;
	}
}
