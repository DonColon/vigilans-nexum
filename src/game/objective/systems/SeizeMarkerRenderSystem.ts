import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent } from "@/game/map/components/GridComponent";
import { TileMapComponent } from "@/game/map/components/TileMapComponent";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { ObjectiveComponent } from "@/game/objective/components/ObjectiveComponent";
import { WinCondition } from "@/game/objective/content/Objectives";
import { seizeMarkerBob, SeizeMarkerTheme } from "@/game/objective/view/SeizeMarker";

/**
 * Draws the seize marker - the tileset's red flag on the tile the battle is
 * won on, bobbing slowly - while the objective is a seize still being fought.
 * On the "background" layer between the terrain art (14) and the range
 * overlays (16, 17), so an enemy wash or a picked-up unit's range reads over
 * it the way they read over the terrain, and the unit tokens (18) stand on
 * top of it. It never clears - GridRenderSystem wipes the layer every frame -
 * and, like the terrain art, it waits for the tileset to load.
 */
export class SeizeMarkerRenderSystem extends MapRenderSystem {
	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	/** Milliseconds the marker has been drawn for - the bob's clock. */
	private time = 0;

	public initialize(): this {
		this.queries = {
			tilemaps: new Query({ allowlist: [TileMapComponent, GridComponent, TransformComponent] })
		};

		this.time = 0;

		return this;
	}

	public execute(elapsed: number): void {
		// Read off the world, not a query: the frame after a restart a query still
		// holds the old battle's objective.
		const objective = this.world.entityWith(ObjectiveComponent);
		const view = this.mapView(this.queries.tilemaps.getSingleResult());

		if (objective === null || view === null) {
			return;
		}

		const data = objective.getComponent(ObjectiveComponent).read();
		const tilemap = view.map.getComponent(TileMapComponent).read();

		if (data.win !== WinCondition.SEIZE || ObjectiveComponent.isDecided(data) || !this.assetStorage.hasSpritesheet(tilemap.tileset)) {
			return;
		}

		this.time += elapsed;

		const { origin, cellSize } = view;
		const scale = cellSize / tilemap.tileWidth;
		const graphics = this.display.getLayer("background");

		// Scaled-up 1-bit art, so smoothing stays off - see TileMapRenderSystem.
		graphics.imageSmoothing();
		graphics.drawTile(tilemap.tileset, SeizeMarkerTheme.frame, origin.x + data.seizeColumn * cellSize, origin.y + data.seizeRow * cellSize + seizeMarkerBob(this.time) * scale, scale);
	}
}
