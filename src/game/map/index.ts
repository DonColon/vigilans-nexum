export { MapFeature } from "@/game/map/MapFeature";
export { BattleMapFeature } from "@/game/map/BattleMapFeature";

export { CursorComponent } from "@/game/map/components/CursorComponent";
export { GridComponent } from "@/game/map/components/GridComponent";
export type { GridData } from "@/game/map/components/GridComponent";
export { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
export type { GridPositionData } from "@/game/map/components/GridPositionComponent";
export { TileMapComponent } from "@/game/map/components/TileMapComponent";
export type { TileMapData } from "@/game/map/components/TileMapComponent";

export { MapState } from "@/game/map/states/MapState";

export { GridSystem } from "@/game/map/systems/GridSystem";
export { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
export type { MapView } from "@/game/map/systems/MapRenderSystem";
export { CursorSystem } from "@/game/map/systems/CursorSystem";
export { CursorRenderSystem } from "@/game/map/systems/CursorRenderSystem";
export { GridRenderSystem } from "@/game/map/systems/GridRenderSystem";
export { TileMapRenderSystem } from "@/game/map/systems/TileMapRenderSystem";

export { moveCursorCommands } from "@/game/map/commands/MoveCursorCommand";
export { confirmCommands } from "@/game/map/commands/ConfirmCommand";
export { cancelCommands } from "@/game/map/commands/CancelCommand";
export { MapCommand } from "@/game/map/commands/MapCommand";
export type { MapCommandContext } from "@/game/map/commands/MapCommand";

export { Terrain, terrainProperties, getTerrainProperties, isPassable, IMPASSABLE } from "@/game/map/model/Terrain";
export type { TerrainType, TerrainProperties } from "@/game/map/model/Terrain";
export { MapTheme } from "@/game/map/model/MapTheme";
