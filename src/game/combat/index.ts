export { CombatFeature } from "@/game/combat/CombatFeature";

export { ForecastComponent } from "@/game/combat/components/ForecastComponent";
export type { ForecastData, ForecastPhase } from "@/game/combat/components/ForecastComponent";
export { BattleAnimationComponent } from "@/game/combat/components/BattleAnimationComponent";
export type { BattleAnimationData } from "@/game/combat/components/BattleAnimationComponent";
export { CombatAnimationComponent } from "@/game/combat/components/CombatAnimationComponent";
export type { CombatAnimationData } from "@/game/combat/components/CombatAnimationComponent";

export { ForecastState } from "@/game/combat/states/ForecastState";
export type { ForecastRequest } from "@/game/combat/states/ForecastState";
export { BattleAnimationState } from "@/game/combat/states/BattleAnimationState";
export { forecastCommands } from "@/game/combat/commands/ForecastCommands";
export { ForecastSystem } from "@/game/combat/systems/ForecastSystem";
export { ForecastRenderSystem } from "@/game/combat/systems/ForecastRenderSystem";
export { BattleAnimationSystem } from "@/game/combat/systems/BattleAnimationSystem";
export { weaponsReaching, canReachAny, targetsInReach, forecastBattle } from "@/game/combat/rules/Targeting";

export {
	weaponTriangle,
	attackSpeed,
	attackPower,
	hitRate,
	avoidRate,
	critRate,
	critAvoid,
	damagePerHit,
	computeStrike,
	doublesAt,
	weaponReaches,
	isMagicWeapon,
	TRIANGLE_MIGHT,
	TRIANGLE_HIT,
	DOUBLE_THRESHOLD,
	CRIT_MULTIPLIER
} from "@/game/combat/rules/CombatMath";
export type { Strike, StrikeInputs, TriangleRelation } from "@/game/combat/rules/CombatMath";

export { buildForecast, resolveCombat, DEFAULT_COMBAT_ROLLS } from "@/game/combat/rules/BattleForecast";
export type { BattleForecast, CombatantForecast, ForecastInputs, CombatOutcome, CombatRolls, ResolvedStrike, StrikeSide } from "@/game/combat/rules/BattleForecast";

export { battleAnimationSteps, battleAnimationDuration, battleAnimationFrame } from "@/game/combat/view/BattleAnimation";
export type { BattleAnimationFrame, TokenAnimationState } from "@/game/combat/view/BattleAnimation";
export type { BattleAnimationStep } from "@/game/combat/components/BattleAnimationComponent";

export { CombatTheme } from "@/game/combat/view/CombatTheme";
