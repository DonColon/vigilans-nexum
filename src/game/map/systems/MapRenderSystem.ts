import { Entity } from "@/core/ecs/Entity";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";
import { World } from "@/core/ecs/World";
import { Display } from "@/core/graphics/Display";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";

/** The battle map as a renderer needs it: its tiles and where they sit on screen. */
export interface MapView {
	map: Entity;
	grid: GridData;
	/** Top-left screen pixel of the map, the transform hierarchy resolved. */
	origin: Vector2D;
	/** Edge length of a tile in pixels - `grid.cellSize`, at hand for the tile maths. */
	cellSize: number;
}

/**
 * Base for the renderers that draw on top of the battle map. Every one of them
 * needs the same three things before it can put a pixel down - the world, the
 * display and where the map is this frame - so they are resolved here rather
 * than in each `execute`.
 *
 * The map query stays with the subclass: they do not all ask for the same
 * components, and a renderer that needs more than the map keeps its queries
 * together in its own `initialize`.
 */
export abstract class MapRenderSystem extends RenderSystem {
	@GameCoreService(World)
	protected world!: World;

	@GameCoreService(Display)
	protected display!: Display;

	/** The system that resolves the transform hierarchy - where anything parented to the map ends up. */
	protected transforms(): TransformSystem {
		return this.world.getSystem(TransformSystem);
	}

	/**
	 * The map to draw against, or null when there is none on screen or its
	 * position is not resolved yet - in which case the renderer has nothing to do
	 * this frame.
	 */
	protected mapView(map: Entity | null): MapView | null {
		if (map === null || !map.hasComponent(GridComponent)) {
			return null;
		}

		const origin = this.transforms().getWorldPosition(map);

		if (origin === null) {
			return null;
		}

		const grid = map.getComponent(GridComponent).read();

		return { map, grid, origin, cellSize: grid.cellSize };
	}
}
