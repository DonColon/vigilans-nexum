/*
 * Where a map bigger than the screen sits - the camera Fire Emblem has: the
 * cursor roams the screen freely, the view only moves once it nears an edge,
 * and it glides there rather than jumping. Pure: one axis at a time, in pixels,
 * so the camera system and a spec ask the same way.
 */

/** Tiles kept between the cursor and the edge of the screen, so the player sees what it is heading for. */
export const CAMERA_MARGIN_TILES = 2;

/** Milliseconds the view takes to cover most of the way to where it is going. */
export const CAMERA_GLIDE_MS = 70;

/** One axis of the map and the screen, in pixels. */
export interface CameraAxis {
	/** Where the map's edge is on screen now. */
	offset: number;
	/** Where the cursor's tile starts inside the map. */
	cursor: number;
	/** Edge length of a tile. */
	cellSize: number;
	/** The map's size along this axis. */
	mapSize: number;
	/** The screen's size along this axis. */
	viewSize: number;
}

/** An offset kept from showing a band beyond the map's edges, or centred when the whole map fits. */
function clamped(offset: number, mapSize: number, viewSize: number): number {
	if (mapSize <= viewSize) {
		return Math.round((viewSize - mapSize) / 2);
	}

	return Math.min(0, Math.max(viewSize - mapSize, offset));
}

/**
 * Where the map goes for the cursor to stay in view: only as far as it takes to
 * keep the cursor [[CAMERA_MARGIN_TILES]] from the edge, so inside the margins
 * the view holds still.
 */
export function cameraOffset({ offset, cursor, cellSize, mapSize, viewSize }: CameraAxis): number {
	const margin = CAMERA_MARGIN_TILES * cellSize;
	const lowest = margin - cursor;
	const highest = viewSize - margin - cellSize - cursor;

	return clamped(Math.max(lowest, Math.min(highest, offset)), mapSize, viewSize);
}

/** The view with the cursor in its middle - where a battle opens, on the commander. */
export function cameraCentred({ cursor, cellSize, mapSize, viewSize }: Omit<CameraAxis, "offset">): number {
	return clamped(Math.round((viewSize - cellSize) / 2 - cursor), mapSize, viewSize);
}

/** The next frame of a glide from `from` to `to`: whole pixels, so the art stays crisp, and landing rather than creeping. */
export function cameraGlide(from: number, to: number, elapsed: number): number {
	const distance = Math.abs(to - from);
	const step = Math.ceil(distance * (1 - Math.exp(-elapsed / CAMERA_GLIDE_MS)));

	return from + Math.sign(to - from) * Math.min(distance, step);
}
