import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventBus } from "@/core/events/EventBus";
import { UnsubscribeFunction } from "@/core/events/GameEvents";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { cameraCentred, cameraGlide, cameraOffset } from "@/game/map/rules/MapCamera";

/**
 * The battle map's camera. Everything on the map hangs below the map's
 * transform, so moving that one transform moves the tiles, the units and every
 * overlay together, and where anything is on screen is always read off it - no
 * renderer knows a camera exists.
 *
 * It follows the cursor, which is also how it follows everything else: the
 * enemy phase puts the cursor on whoever is acting, the forecast on its target.
 * A battle opens with the view already centred on the commander, once the units
 * feature has dropped the cursor there; from then on the view glides.
 */
export class MapCameraSystem extends UpdateSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(EventBus)
	private events!: EventBus;

	/** Where the view is going, as opposed to where it has got to. */
	private target: { map: string; x: number; y: number } | null = null;

	/** The battle has just been set up: the next frame centres rather than glides. */
	private opening = false;

	private unsubscribe: UnsubscribeFunction | null = null;

	public initialize(): this {
		this.queries = {
			maps: new Query({ allowlist: [GridComponent, TransformComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] })
		};

		// Below the units feature's own handler (0), so the cursor is on the commander.
		this.unsubscribe = this.events.subscribe(
			"map:ready",
			() => {
				this.opening = true;
			},
			-10
		);

		return this;
	}

	public dispose(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		super.dispose();
	}

	public execute(elapsed: number): void {
		const map = this.queries.maps.getSingleResult();
		const cursor = this.queries.cursors.getSingleResult();

		if (map === null || cursor === null) {
			return;
		}

		const grid = map.getComponent(GridComponent).read();
		const tile = cursor.getComponent(GridPositionComponent).read();
		const size = GridComponent.dimension(grid);
		const viewport = this.display.getViewportDimension();
		const transform = map.getComponent(TransformComponent);
		const local = transform.read();

		const across = { cursor: tile.column * grid.cellSize, cellSize: grid.cellSize, mapSize: size.width, viewSize: viewport.width };
		const down = { cursor: tile.row * grid.cellSize, cellSize: grid.cellSize, mapSize: size.height, viewSize: viewport.height };

		if (this.opening) {
			this.opening = false;
			this.target = { map: map.getID(), x: cameraCentred(across), y: cameraCentred(down) };
			transform.update({ ...local, x: this.target.x, y: this.target.y });
			return;
		}

		const from = this.target?.map === map.getID() ? this.target : { x: local.x, y: local.y };

		this.target = { map: map.getID(), x: cameraOffset({ ...across, offset: from.x }), y: cameraOffset({ ...down, offset: from.y }) };

		const x = cameraGlide(local.x, this.target.x, elapsed);
		const y = cameraGlide(local.y, this.target.y, elapsed);

		if (x !== local.x || y !== local.y) {
			transform.update({ ...local, x, y });
		}
	}
}
