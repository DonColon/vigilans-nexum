import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { clamp } from "@/core/math/utils/Clamp";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { ForecastCommand } from "@/game/combat/commands/ForecastCommands";
import { ForecastComponent, ForecastData } from "@/game/combat/components/ForecastComponent";
import { ForecastState } from "@/game/combat/states/ForecastState";
import { CombatSystem } from "@/game/combat/systems/CombatSystem";

/**
 * Drives the open forecast: it keeps the previewed target / weapon consistent as
 * the player cycles them, parks the map cursor on the current target - Fire
 * Emblem's "who am I hitting" marker - and, the moment the player commits or
 * backs out, reports the outcome through an event and pops the state. It never
 * fights - the CombatFeature listens for `combat:confirmed` and plays it out.
 */
export class ForecastSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const state = this.stateManager.peek();

		if (!(state instanceof ForecastState)) {
			return;
		}

		const entity = state.getForecast();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(ForecastComponent);
		this.reconcile(component);

		const data = component.read();

		if (data.cancelled) {
			this.restoreCursor(data);
			this.eventSystem.dispatch("combat:cancelled", { attackerId: data.attackerId });
			this.stateManager.pop();
			return;
		}

		if (data.confirmed) {
			this.eventSystem.dispatch("combat:confirmed", {
				attackerId: data.attackerId,
				defenderId: data.defenderId,
				weaponId: data.weaponIds[data.weaponIndex] ?? ""
			});
			this.stateManager.pop();
			return;
		}

		this.runCommands(elapsed, frame, state, entity);
		this.parkCursor(component.read());
	}

	/** Snaps `defenderId` / `weaponIds` / `weaponIndex` to whatever target is previewed now. */
	private reconcile(component: ForecastComponent): void {
		const data = component.read();

		if (data.defenderIds.length === 0) {
			return;
		}

		const defenderIndex = clamp(data.defenderIndex, 0, data.defenderIds.length - 1);
		const defenderId = data.defenderIds[defenderIndex];
		const attacker = this.unit(data.attackerId);
		const defender = this.unit(defenderId);

		if (attacker === null || defender === null) {
			return;
		}

		const distance = CombatSystem.distance(attacker.getComponent(GridPositionComponent).read(), defender.getComponent(GridPositionComponent).read());
		const weaponIds = CombatSystem.weaponsReaching(attacker.getComponent(UnitComponent).read(), distance).map((entry) => entry.id);
		const weaponIndex = clamp(data.weaponIndex, 0, Math.max(1, weaponIds.length) - 1);

		if (defenderIndex === data.defenderIndex && defenderId === data.defenderId && weaponIndex === data.weaponIndex && sameList(weaponIds, data.weaponIds)) {
			return;
		}

		component.update({ ...data, defenderIndex, defenderId, weaponIds, weaponIndex });
	}

	private parkCursor(data: ForecastData): void {
		const defender = this.unit(data.defenderId);
		const cursor = this.queries.cursors.getSingleResult();

		if (defender === null || cursor === null) {
			return;
		}

		this.moveCursor(cursor, defender.getComponent(GridPositionComponent).read());
	}

	private restoreCursor(data: ForecastData): void {
		const cursor = this.queries.cursors.getSingleResult();

		if (cursor !== null) {
			this.moveCursor(cursor, { column: data.restoreColumn, row: data.restoreRow });
		}
	}

	private moveCursor(cursor: Entity, tile: { column: number; row: number }): void {
		const component = cursor.getComponent(GridPositionComponent);
		const current = component.read();

		if (current.column !== tile.column || current.row !== tile.row) {
			component.update({ ...current, column: tile.column, row: tile.row });
		}
	}

	/** The unit with this id, out of the ones on the map right now. */
	private unit(id: string): Entity | null {
		return UnitSystem.byId(this.queries.units.getResult(), id);
	}

	private runCommands(elapsed: number, frame: number, state: ForecastState, forecast: Entity): void {
		for (const command of state.getCommands(ForecastCommand)) {
			command.execute(elapsed, frame, { forecast });
		}
	}
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}
