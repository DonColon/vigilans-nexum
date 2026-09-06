export { MovementFeature } from "@/game/movement/MovementFeature";

export { MovementComponent, idleMovement } from "@/game/movement/components/MovementComponent";
export type { MovementData } from "@/game/movement/components/MovementComponent";

export { MovementSystem } from "@/game/movement/systems/MovementSystem";
export type { ReachableTile } from "@/game/movement/systems/MovementSystem";
export { PathPreviewSystem } from "@/game/movement/systems/PathPreviewSystem";
export { MovementRenderSystem } from "@/game/movement/systems/MovementRenderSystem";

export { pathTiles, OPPOSITE } from "@/game/movement/model/PathTiles";
export type { PathTileSprite, PathKind, Direction } from "@/game/movement/model/PathTiles";
export { MovementTheme } from "@/game/movement/model/MovementTheme";
