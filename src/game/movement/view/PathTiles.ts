import { GridPositionData } from "@/game/map/components/GridPositionComponent";

/** The side of a tile the path touches, as a direction from the tile centre. */
export type Direction = "up" | "down" | "left" | "right";

export const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };

/** Which part of the path a tile shows. */
export type PathKind = "start" | "straight" | "corner" | "head";

/**
 * One tile of the move path. `edges` are the tile sides the band reaches - two
 * for a straight or a corner, one for the start stub and the head. The renderer
 * draws the band from filled rectangles rather than tilesheet frames: the
 * kenney path tiles are 6px on a 16px grid, so any rotation of them lands half a
 * pixel off and a turned corner never meets the straight beside it cleanly.
 */
export interface PathTileSprite {
	column: number;
	row: number;
	kind: PathKind;
	edges: Direction[];
}

function direction(from: GridPositionData, to: GridPositionData): Direction {
	if (to.row < from.row) return "up";
	if (to.row > from.row) return "down";
	if (to.column < from.column) return "left";
	return "right";
}

/**
 * Turns a route (start tile first, destination last) into the path tiles drawn
 * over it: a stub on the unit's own tile, a straight or a corner on every tile
 * between, and the head on the destination pointing the way the unit arrives.
 */
export function pathTiles(route: readonly GridPositionData[]): PathTileSprite[] {
	if (route.length < 2) {
		return [];
	}

	const tiles: PathTileSprite[] = [];

	for (let index = 0; index < route.length; index++) {
		const tile = route[index];

		if (index === 0) {
			tiles.push({ column: tile.column, row: tile.row, kind: "start", edges: [direction(tile, route[1])] });
			continue;
		}

		const arrive = direction(route[index - 1], tile);

		if (index === route.length - 1) {
			tiles.push({ column: tile.column, row: tile.row, kind: "head", edges: [OPPOSITE[arrive]] });
			continue;
		}

		const leave = direction(tile, route[index + 1]);
		const kind: PathKind = arrive === leave ? "straight" : "corner";

		tiles.push({ column: tile.column, row: tile.row, kind, edges: [OPPOSITE[arrive], leave] });
	}

	return tiles;
}
