import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { TileMapComponent } from "@/game/map/components/TileMapComponent";
import { cancelCommands } from "@/game/map/commands/CancelCommand";
import { confirmCommands } from "@/game/map/commands/ConfirmCommand";
import { moveCursorCommands } from "@/game/map/commands/MoveCursorCommand";
import { MapState } from "@/game/map/states/MapState";
import { CursorRenderSystem } from "@/game/map/systems/CursorRenderSystem";
import { CursorSystem } from "@/game/map/systems/CursorSystem";
import { GridRenderSystem } from "@/game/map/systems/GridRenderSystem";
import { TileMapRenderSystem } from "@/game/map/systems/TileMapRenderSystem";

/**
 * Everything the player sees and does while looking at a battle map: the grid
 * itself, the cursor moving over it and the state both of them live in.
 */
export class MapFeature extends GameFeature {
	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [GridComponent, TileMapComponent, CursorComponent, GridPositionComponent],
			states: [MapState],
			// Registered here, allowed by the MapState: the feature owns the
			// instances, the state decides when the player may trigger them.
			commands: [...moveCursorCommands, ...confirmCommands, ...cancelCommands],
			systems: [
				// The cursor transform has to be up to date before the sync phase
				// resolves the transform hierarchy for this frame.
				{ system: CursorSystem, priority: 10 },
				// The map is the backdrop of the gameplay layer the cursor is on:
				// the flat terrain colours first, the tileset art over them, the
				// cursor on top of both.
				{ system: GridRenderSystem, priority: 10 },
				{ system: TileMapRenderSystem, priority: 15 },
				{ system: CursorRenderSystem, priority: 20 }
			],
			...config
		});
	}
}
