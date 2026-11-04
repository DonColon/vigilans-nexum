import { clamp01 } from "@/core/math/utils/Clamp";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";

/** Milliseconds a walking unit spends crossing one tile. */
export const WALK_STEP_MS = 110;

/**
 * The fractional tile position `progress` (0..1) of the way along `path`,
 * moving at a constant one-tile-per-step pace. `progress` outside 0..1 is
 * clamped, so it is safe to feed `elapsed / duration` straight in.
 */
export function walkPoint(path: readonly GridPositionData[], progress: number): { column: number; row: number } {
	if (path.length === 0) {
		return { column: 0, row: 0 };
	}

	if (path.length === 1) {
		return { column: path[0].column, row: path[0].row };
	}

	const clamped = clamp01(progress);
	const scaled = clamped * (path.length - 1);
	const index = Math.min(path.length - 2, Math.floor(scaled));
	const fraction = scaled - index;

	const from = path[index];
	const to = path[index + 1];

	return {
		column: from.column + (to.column - from.column) * fraction,
		row: from.row + (to.row - from.row) * fraction
	};
}
