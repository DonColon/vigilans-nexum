import { Entity } from "@/core/ecs/Entity";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { World } from "@/core/ecs/World";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent, GridData } from "@/game/map/components/GridComponent";

/*
 * The battle map [[MapState]] has on screen, for anything that reacts to it
 * without a query of its own: the map entity, its grid, its cursor and where
 * a tile lands in pixels. All of it is read off the World at the moment of
 * asking - `map:ready` to `map:closed` is exactly when a map entity exists.
 */

/** The map entity, or null when no map is up (or it has already been torn down). */
export function activeMap(world: World): Entity | null {
	return world.entityWith(GridComponent);
}

/** The grid of the active map - its tiles and their terrain - or null. */
export function activeGrid(world: World): GridData | null {
	return activeMap(world)?.getComponent(GridComponent).read() ?? null;
}

/** The map cursor, or null while no map is on screen. */
export function activeCursor(world: World): Entity | null {
	return world.entityWith(CursorComponent);
}

/** Top-left screen pixel of a map tile - the map transform plus the tile offset. */
export function tileToScreen(world: World, column: number, row: number): { x: number; y: number } | null {
	const map = activeMap(world);

	if (map === null || !map.hasComponent(TransformComponent)) {
		return null;
	}

	const transform = map.getComponent(TransformComponent).read();
	const { cellSize } = map.getComponent(GridComponent).read();

	return { x: transform.x + column * cellSize, y: transform.y + row * cellSize };
}
