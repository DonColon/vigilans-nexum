import { Entity } from "@/core/ecs/Entity";
import { EventSystem } from "@/core/events/EventSystem";
import { UnsubscribeFunction } from "@/core/events/GameEvents";
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CombatConfirmedEvent, CombatRequestedEvent, UnitDiedEvent } from "@/game.events";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { equipInventoryItem, spendWeaponUses } from "@/game/units/model/Inventory";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { forecastCommands } from "@/game/combat/commands/ForecastCommands";
import { BattleAnimationComponent } from "@/game/combat/components/BattleAnimationComponent";
import { CombatAnimationComponent } from "@/game/combat/components/CombatAnimationComponent";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";
import { battleAnimationSteps } from "@/game/combat/model/BattleAnimation";
import { resolveCombat } from "@/game/combat/model/BattleForecast";
import { CombatSystem } from "@/game/combat/systems/CombatSystem";
import { BattleAnimationSystem } from "@/game/combat/systems/BattleAnimationSystem";
import { ForecastRenderSystem } from "@/game/combat/systems/ForecastRenderSystem";
import { ForecastSystem } from "@/game/combat/systems/ForecastSystem";
import { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";
import { ForecastState } from "@/game/combat/states/ForecastState";

/**
 * The Fire Emblem attack flow, layered on top of the [[MovementFeature]]:
 *
 *  - `combat:requested` (the "Attack" command, with a target) opens the battle
 *    forecast - a [[ForecastState]] with the two units and the attacker's
 *    reaching weapons. `< >` cycles the weapon, `ForecastRenderSystem` redraws
 *    the numbers (each side tinted its faction colour), confirm fires
 *    `combat:confirmed`, cancel `combat:cancelled`.
 *  - `combat:confirmed` readies the chosen weapon, resolves the fight with
 *    `resolveCombat` (Radiant Dawn formulas, real rolls), writes HP / weapon
 *    uses back, and hands off to a [[BattleAnimationState]]: the lunge / flash /
 *    HP-drain animation plays, then `unit:died` takes any fallen unit off the
 *    map and `combat:resolved` lets MovementFeature spend the attacker.
 */
export class CombatFeature extends GameFeature {
	@GameCoreService(EventSystem)
	private events!: EventSystem;

	private subscriptions: UnsubscribeFunction[] = [];
	private mapId: string | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [ForecastComponent, BattleAnimationComponent, CombatAnimationComponent],
			states: [ForecastState, BattleAnimationState],
			commands: [...forecastCommands],
			systems: [
				// Alongside MenuSystem / DialogSystem in the update phase.
				{ system: ForecastSystem, priority: 10 },
				// The animation clock; order among the update systems does not matter.
				{ system: BattleAnimationSystem, priority: 8 },
				// After UIRenderSystem (50), which owns and clears the "ui" layer.
				{ system: ForecastRenderSystem, priority: 52 }
			],
			...config
		});
	}

	protected onInstall(): void {
		this.subscriptions.push(
			this.events.subscribe("map:ready", (event) => (this.mapId = event.mapId)),
			this.events.subscribe("map:closed", () => (this.mapId = null)),
			this.events.subscribe("combat:requested", (event) => this.openForecast(event)),
			this.events.subscribe("combat:confirmed", (event) => this.resolve(event)),
			this.events.subscribe("unit:died", (event) => this.removeUnit(event))
		);
	}

	protected onUninstall(): void {
		for (const unsubscribe of this.subscriptions) {
			unsubscribe();
		}

		this.subscriptions = [];
		this.mapId = null;
	}

	private openForecast(event: CombatRequestedEvent): void {
		const units = this.units();
		const attacker = UnitSystem.byId(units, event.attackerId);

		if (attacker === null) {
			return;
		}

		const attackerData = attacker.getComponent(UnitComponent).read();
		const attackerTile = attacker.getComponent(GridPositionComponent).read();

		// Every enemy the attacker can hit from here, nearest first; the requested
		// one leads when it is still in reach.
		const enemies = units.filter((entity) => entity.getComponent(UnitComponent).read().faction !== attackerData.faction);
		const targets = CombatSystem.targetsInReach(attackerData, attackerTile, enemies, (enemy) => enemy.getComponent(GridPositionComponent).read());

		if (targets.length === 0) {
			return;
		}

		const defenderIds = targets.map((enemy) => enemy.getComponent(UnitComponent).read().id);
		const requestedIndex = defenderIds.indexOf(event.defenderId);
		const defenderIndex = requestedIndex >= 0 ? requestedIndex : 0;

		const distance = CombatSystem.distance(attackerTile, targets[defenderIndex].getComponent(GridPositionComponent).read());
		const weaponIds = CombatSystem.weaponsReaching(attackerData, distance).map((entry) => entry.id);
		const equippedIndex = weaponIds.indexOf(attackerData.weapon?.id ?? "");

		(this.stateManager.getState(ForecastState) as ForecastState).request({
			attackerId: event.attackerId,
			defenderIds,
			defenderIndex,
			weaponIds,
			weaponIndex: equippedIndex >= 0 ? equippedIndex : 0,
			restoreColumn: attackerTile.column,
			restoreRow: attackerTile.row
		});
		this.stateManager.push(ForecastState);
	}

	private resolve(event: CombatConfirmedEvent): void {
		const grid = this.grid();
		const units = this.units();
		const attacker = UnitSystem.byId(units, event.attackerId);
		const defender = UnitSystem.byId(units, event.defenderId);

		if (grid === null || attacker === null || defender === null) {
			return;
		}

		const attackerComponent = attacker.getComponent(UnitComponent);
		const weaponIndex = attackerComponent.read().inventory.findIndex((entry) => entry.id === event.weaponId);
		const armed = weaponIndex >= 0 ? equipInventoryItem(attackerComponent.read(), weaponIndex) : attackerComponent.read();
		const weapon = armed.weapon;

		if (weapon === null) {
			return;
		}

		const defenderComponent = defender.getComponent(UnitComponent);
		const defenderData = defenderComponent.read();
		const attackerTile = attacker.getComponent(GridPositionComponent).read();
		const defenderTile = defender.getComponent(GridPositionComponent).read();

		const forecast = CombatSystem.forecast(armed, attackerTile, weapon, defenderData, defenderTile, grid);
		const outcome = resolveCombat(forecast);

		// Data changes land now; the BattleAnimationState only delays the visual.
		const attackerAfter = spendWeaponUses({ ...armed, currentHP: outcome.attackerHp }, event.weaponId, outcome.attackerSwings);
		const defenderHurt = { ...defenderData, currentHP: outcome.defenderHp };
		const defenderAfter = defenderData.weapon === null ? defenderHurt : spendWeaponUses(defenderHurt, defenderData.weapon.id, outcome.defenderSwings);

		attackerComponent.update(attackerAfter);
		defenderComponent.update(defenderAfter);

		(this.stateManager.getState(BattleAnimationState) as BattleAnimationState).request({
			attackerId: event.attackerId,
			defenderId: event.defenderId,
			attackerColumn: attackerTile.column,
			attackerRow: attackerTile.row,
			defenderColumn: defenderTile.column,
			defenderRow: defenderTile.row,
			startAttackerHp: armed.currentHP,
			startDefenderHp: defenderData.currentHP,
			steps: battleAnimationSteps(armed.currentHP, defenderData.currentHP, outcome.strikes),
			elapsed: 0,
			attackerDefeated: outcome.attackerDefeated,
			defenderDefeated: outcome.defenderDefeated
		});
		this.stateManager.push(BattleAnimationState);
	}

	/** `unit:died` (from the animation landing) - take the unit off the map. */
	private removeUnit(event: UnitDiedEvent): void {
		const unit = UnitSystem.byId(this.units(), event.unitId);

		if (unit !== null) {
			this.world.unregisterEntity(unit);
		}
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
