export { ObjectiveFeature } from "@/game/objective/ObjectiveFeature";
export { ObjectiveFlowSystem } from "@/game/objective/systems/ObjectiveFlowSystem";
export { ObjectiveSystem } from "@/game/objective/systems/ObjectiveSystem";
export { OutcomeRenderSystem } from "@/game/objective/systems/OutcomeRenderSystem";

export { ObjectiveComponent, Outcome } from "@/game/objective/components/ObjectiveComponent";
export type { ObjectiveData } from "@/game/objective/components/ObjectiveComponent";
export { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
export type { OutcomeData } from "@/game/objective/components/OutcomeComponent";

export { OutcomeState } from "@/game/objective/states/OutcomeState";
export type { OutcomeRequest } from "@/game/objective/states/OutcomeState";
export { outcomeCommands, OutcomeCommand } from "@/game/objective/commands/OutcomeCommands";

export { WinCondition, isWinCondition, objectiveOf } from "@/game/objective/content/Objectives";
export type { ObjectiveSetup } from "@/game/objective/content/Objectives";
export { battleOutcome, canSeize } from "@/game/objective/rules/Outcome";
export { OutcomeBannerTheme, outcomeBannerFrame, outcomeAcceptsPress, OUTCOME_HOLD_MS } from "@/game/objective/view/OutcomeBanner";
