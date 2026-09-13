export { ExperienceFeature } from "@/game/experience/ExperienceFeature";

export { ExperienceComponent, ExperiencePhase } from "@/game/experience/components/ExperienceComponent";
export type { ExperienceData } from "@/game/experience/components/ExperienceComponent";

export { ExperienceState } from "@/game/experience/states/ExperienceState";

export { ExperienceSystem } from "@/game/experience/systems/ExperienceSystem";
export { ExperienceRenderSystem } from "@/game/experience/systems/ExperienceRenderSystem";

export {
	DAMAGE_BASE,
	KILL_BONUS,
	BOSS_BONUS,
	NO_DAMAGE_EXPERIENCE,
	MAX_COMBAT_EXPERIENCE,
	effectiveLevel,
	damageExperience,
	killExperience,
	combatExperience,
	staffExperience,
	rollGrowths,
	gainExperience
} from "@/game/experience/rules/Experience";
export type { CombatShare, GrowthRoll, LevelUp, ExperienceGain } from "@/game/experience/rules/Experience";

export { experienceFrame, experienceBox, experienceDuration, experienceFillDuration } from "@/game/experience/view/ExperienceBar";
export type { ExperienceFrame } from "@/game/experience/view/ExperienceBar";

export { levelUpFrame, levelUpDuration, levelUpBox, levelUpHeight, raisedStats } from "@/game/experience/view/LevelUpPanel";
export type { LevelUpFrame, LevelUpStat } from "@/game/experience/view/LevelUpPanel";

export { ExperienceCommand, ConfirmLevelUpCommand, CancelLevelUpCommand, experienceCommands } from "@/game/experience/commands/ExperienceCommands";
export type { ExperienceCommandContext } from "@/game/experience/commands/ExperienceCommands";
