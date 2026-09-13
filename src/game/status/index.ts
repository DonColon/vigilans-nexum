export { StatusFeature } from "@/game/status/StatusFeature";

export { StatusComponent } from "@/game/status/components/StatusComponent";
export type { StatusData } from "@/game/status/components/StatusComponent";

export { StatusState } from "@/game/status/states/StatusState";
export type { StatusRequest } from "@/game/status/states/StatusState";

export { StatusSystem } from "@/game/status/systems/StatusSystem";
export { StatusRenderSystem } from "@/game/status/systems/StatusRenderSystem";
export { UnitCardRenderSystem } from "@/game/status/systems/UnitCardRenderSystem";

export { statusCommands, StatusCommand, StatusPreviousCommand, StatusNextCommand, StatusConfirmCommand, StatusCancelCommand, StatusInfoCommand } from "@/game/status/commands/StatusCommands";
export type { StatusCommandContext } from "@/game/status/commands/StatusCommands";

export {
	STATUS_COLUMNS,
	STATUS_COLUMN_ORDER,
	STATUS_PLATE,
	NO_VALUE,
	EMPTY_SLOT,
	statusPanel,
	statusWidth,
	statusHeight,
	statusColumnLayout,
	statusHeading,
	statusStatRows,
	statusCombatRows,
	statusInventorySlots,
	factionLabel,
	classLine,
	pageLabel,
	rangeText
} from "@/game/status/view/StatusScreen";
export type { StatusRow, StatRow, StatusColumn } from "@/game/status/view/StatusScreen";

export { UnitCard, UNIT_CARD_HEIGHT, UNIT_CARD_ROWS, ENEMY_CARD_ROWS, unitCardHeight, unitCardLines, unitCardRows, unitCardPlacement } from "@/game/status/view/UnitCard";
export type { UnitCardLines, UnitCardBar, UnitCardPlacement } from "@/game/status/view/UnitCard";
