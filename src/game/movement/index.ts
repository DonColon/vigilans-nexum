export { MovementFeature } from "@/game/movement/MovementFeature";

export { MovementComponent, idleMovement } from "@/game/movement/components/MovementComponent";
export type { MovementData } from "@/game/movement/components/MovementComponent";
export { WalkComponent } from "@/game/movement/components/WalkComponent";
export type { WalkData } from "@/game/movement/components/WalkComponent";
export { PendingMoveComponent } from "@/game/movement/components/PendingMoveComponent";
export type { PendingMoveData } from "@/game/movement/components/PendingMoveComponent";

export { MovementSystem } from "@/game/movement/systems/MovementSystem";
export type { ReachableTile } from "@/game/movement/systems/MovementSystem";
export { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
export { MovementRenderSystem } from "@/game/movement/systems/MovementRenderSystem";
export { UnitWalkSystem } from "@/game/movement/systems/UnitWalkSystem";

export { pathTiles, OPPOSITE } from "@/game/movement/model/PathTiles";
export type { PathTileSprite, PathKind, Direction } from "@/game/movement/model/PathTiles";
export { walkPoint, WALK_STEP_MS } from "@/game/movement/model/PathWalk";
export { MovementTheme } from "@/game/movement/model/MovementTheme";

export {
	UnitMenuRow,
	rowLabel,
	unitCommandRows,
	itemActionRows,
	globalCommandRequest,
	unitCommandRequest,
	itemsRequest,
	itemActionRequest,
	COMMAND_MENU,
	GLOBAL_MENU,
	ITEMS_MENU,
	ITEM_ACTION_MENU
} from "@/game/movement/model/UnitMenus";
