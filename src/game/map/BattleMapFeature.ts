import { Entity } from "@/core/ecs/Entity";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameFeature } from "@/core/GameFeature";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";

/**
 * Base for the features that work on the battle map [[MapState]] puts on
 * screen. It follows which map is up - `map:ready` to `map:closed` - and hands
 * its subclasses the handful of lookups every one of them needs off it: the
 * grid, the cursor and where a tile lands on screen.
 *
 * A subclass wiring up its own events has to call `super.onInstall()`, which
 * also puts the map tracking in place before its own handlers run.
 */
export abstract class BattleMapFeature extends GameFeature {
	private mapId: string | null = null;

	protected onInstall(): void {
		this.subscribe("map:ready", (event) => (this.mapId = event.mapId));
		this.subscribe("map:closed", () => (this.mapId = null));
	}

	protected onUninstall(): void {
		this.mapId = null;
	}

	/** Id of the map entity currently on screen, or null when there is none. */
	protected getMapId(): string | null {
		return this.mapId;
	}

	/** The map entity, or null when no map is up (or it has already been torn down). */
	protected map(): Entity | null {
		if (this.mapId === null || !this.world.hasEntity(this.mapId)) {
			return null;
		}

		return this.world.getEntity(this.mapId);
	}

	/** The grid of the active map - its tiles and their terrain - or null. */
	protected grid(): GridData | null {
		const map = this.map();

		if (map === null || !map.hasComponent(GridComponent)) {
			return null;
		}

		return map.getComponent(GridComponent).read();
	}

	/** The map cursor, or null while no map is on screen. */
	protected cursor(): Entity | null {
		return this.world.getEntities().find((entity) => entity.hasComponent(CursorComponent)) ?? null;
	}

	/** Top-left screen pixel of a map tile - the map transform plus the tile offset. */
	protected tileToScreen(column: number, row: number): { x: number; y: number } | null {
		const map = this.map();

		if (map === null || !map.hasComponent(TransformComponent) || !map.hasComponent(GridComponent)) {
			return null;
		}

		const transform = map.getComponent(TransformComponent).read();
		const { cellSize } = map.getComponent(GridComponent).read();

		return { x: transform.x + column * cellSize, y: transform.y + row * cellSize };
	}
}
