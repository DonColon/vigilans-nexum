import { ReactiveSystem } from "@/core/ecs/ReactiveSystem";
import { CombatConfirmedEvent, CombatRequestedEvent, UnitDiedEvent } from "@/game.events";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { activeGrid } from "@/game/map/rules/ActiveMap";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitsInWorld, unitById, enemiesOf } from "@/game/units/rules/UnitLookup";
import { battleAnimationDuration, battleAnimationSteps } from "@/game/combat/view/BattleAnimation";
import { resolveCombat } from "@/game/combat/rules/BattleForecast";
import { weaponsReaching, targetsInReach, forecastBattle } from "@/game/combat/rules/Targeting";
import { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";
import { OptionId } from "@/game/options/content/GameOptions";
import { optionEnabled } from "@/game/options/GameSettings";
import { ForecastState } from "@/game/combat/states/ForecastState";

/**
 * The Fire Emblem attack flow, on events:
 *
 *  - `combat:requested` (the "Attack" command, with a target) opens the battle
 *    forecast - a [[ForecastState]] with the two units and the attacker's
 *    reaching weapons.
 *  - `combat:confirmed` readies the chosen weapon, resolves the fight with
 *    `resolveCombat` (Radiant Dawn formulas, real rolls), writes HP / weapon
 *    uses back, reports `combat:fought` and hands off to a
 *    [[BattleAnimationState]].
 *  - `unit:died` (from the animation landing) takes the fallen unit off the map.
 */
export class CombatFlowSystem extends ReactiveSystem {
	public initialize(): this {
		this.subscribe("combat:requested", (event) => this.openForecast(event));
		this.subscribe("combat:confirmed", (event) => this.resolve(event));
		this.subscribe("unit:died", (event) => this.removeUnit(event));

		return this;
	}

	private openForecast(event: CombatRequestedEvent): void {
		const units = unitsInWorld(this.world);
		const attacker = unitById(units, event.attackerId);

		if (attacker === null) {
			return;
		}

		const attackerData = attacker.getComponent(UnitComponent).read();
		const attackerTile = attacker.getComponent(GridPositionComponent).read();

		// Every enemy the attacker can hit from here, nearest first; the requested
		// one leads when it is still in reach.
		const enemies = enemiesOf(units, attackerData.faction);
		const targets = targetsInReach(attackerData, attackerTile, enemies, (enemy) => enemy.getComponent(GridPositionComponent).read());

		if (targets.length === 0) {
			return;
		}

		const defenderIds = targets.map((enemy) => enemy.getComponent(UnitComponent).read().id);
		const requestedIndex = defenderIds.indexOf(event.defenderId);
		const defenderIndex = requestedIndex >= 0 ? requestedIndex : 0;

		const distance = GridPositionComponent.distance(attackerTile, targets[defenderIndex].getComponent(GridPositionComponent).read());
		const weaponIds = weaponsReaching(attackerData, distance).map((entry) => entry.id);
		const equippedIndex = weaponIds.indexOf(attackerData.weapon?.id ?? "");

		this.stateManager.getState(ForecastState).request({
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
		const grid = activeGrid(this.world);
		const units = unitsInWorld(this.world);
		const attacker = unitById(units, event.attackerId);
		const defender = unitById(units, event.defenderId);

		if (grid === null || attacker === null || defender === null) {
			return;
		}

		const attackerComponent = attacker.getComponent(UnitComponent);
		const weaponIndex = attackerComponent.read().inventory.findIndex((entry) => entry.id === event.weaponId);
		const armed = weaponIndex >= 0 ? UnitComponent.equip(attackerComponent.read(), weaponIndex) : attackerComponent.read();
		const weapon = armed.weapon;

		if (weapon === null) {
			return;
		}

		const defenderComponent = defender.getComponent(UnitComponent);
		const defenderData = defenderComponent.read();
		const attackerTile = attacker.getComponent(GridPositionComponent).read();
		const defenderTile = defender.getComponent(GridPositionComponent).read();

		const forecast = forecastBattle(armed, attackerTile, weapon, defenderData, defenderTile, grid);
		const outcome = resolveCombat(forecast);

		// Data changes land now; the BattleAnimationState only delays the visual.
		const attackerAfter = UnitComponent.spendWeaponUses({ ...armed, currentHP: outcome.attackerHp }, event.weaponId, outcome.attackerSwings);
		const defenderHurt = { ...defenderData, currentHP: outcome.defenderHp };
		const defenderAfter = defenderData.weapon === null ? defenderHurt : UnitComponent.spendWeaponUses(defenderHurt, defenderData.weapon.id, outcome.defenderSwings);

		attackerComponent.update(attackerAfter);
		defenderComponent.update(defenderAfter);

		// The fight is decided and both sides are still on the map - what the
		// experience feature needs to score it before the fallen are taken off.
		this.events.dispatch("combat:fought", {
			attackerId: event.attackerId,
			defenderId: event.defenderId,
			attackerSwung: outcome.attackerSwings > 0,
			defenderSwung: outcome.defenderSwings > 0,
			attackerDealtDamage: outcome.strikes.some((strike) => strike.side === "attacker" && strike.damage > 0),
			defenderDealtDamage: outcome.strikes.some((strike) => strike.side === "defender" && strike.damage > 0),
			attackerDefeated: outcome.attackerDefeated,
			defenderDefeated: outcome.defenderDefeated
		});

		const steps = battleAnimationSteps(armed.currentHP, defenderData.currentHP, outcome.strikes);

		// With animations turned off the fight still goes through the animation
		// state, just starting at the end of itself: the deaths, the pop and the
		// `combat:resolved` that the move flow waits on all come from the one place
		// they always did, and only the watching is skipped.
		const elapsed = optionEnabled(OptionId.BATTLE_ANIMATIONS) ? 0 : battleAnimationDuration(steps);

		this.stateManager.getState(BattleAnimationState).request({
			attackerId: event.attackerId,
			defenderId: event.defenderId,
			attackerColumn: attackerTile.column,
			attackerRow: attackerTile.row,
			defenderColumn: defenderTile.column,
			defenderRow: defenderTile.row,
			startAttackerHp: armed.currentHP,
			startDefenderHp: defenderData.currentHP,
			steps,
			elapsed,
			attackerDefeated: outcome.attackerDefeated,
			defenderDefeated: outcome.defenderDefeated
		});
		this.stateManager.push(BattleAnimationState);
	}

	/** `unit:died` (from the animation landing) - take the unit off the map. */
	private removeUnit(event: UnitDiedEvent): void {
		const unit = unitById(unitsInWorld(this.world), event.unitId);

		if (unit !== null) {
			this.world.unregisterEntity(unit);
		}
	}
}
