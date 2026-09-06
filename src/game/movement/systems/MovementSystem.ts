import { GridUtils } from "@/core/math/utils/GridUtils";
import { GridData } from "@/game/map/components/GridComponent";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { getTerrainProperties, isPassable } from "@/game/map/model/Terrain";
import { UnitLocation } from "@/game/units/systems/UnitSystem";

/** A tile a unit can stand on, with the movement it costs to get there. */
export interface ReachableTile {
	column: number;
	row: number;
	/** Total terrain cost spent walking here from the start tile. */
	cost: number;
}

interface FloodResult {
	/** Tile key to the cheapest cost of reaching it. */
	cost: Map<string, number>;
	/** Tile key to the key of the tile it was reached from, `null` for the start. */
	cameFrom: Map<string, string | null>;
}

/**
 * Pure movement math for units on a battle grid, kept off the components the
 * same way `GridSystem` is: no queries, no World, so a feature, a system or a
 * test can call it directly.
 *
 * Movement works the Fire Emblem way - a flood fill outward from the unit that
 * spends the class's movement points on the cost of *entering* each tile, stops
 * at impassable terrain and cannot pass through a tile another unit occupies.
 * `path` walks the same fill back to a target for the shortest route; the attack
 * range is every tile within weapon reach of somewhere the unit could move to.
 */
export class MovementSystem {
	/** Stable string key for a tile, for the sets the callers pass around. */
	public static tileKey(column: number, row: number): string {
		return `${column},${row}`;
	}

	/** Tiles blocked because another unit is standing on them. */
	public static blockedTiles(units: readonly UnitLocation[], mover?: string): ReadonlySet<string> {
		const blocked = new Set<string>();

		for (const unit of units) {
			if (unit.id === mover) {
				continue;
			}

			blocked.add(MovementSystem.tileKey(unit.column, unit.row));
		}

		return blocked;
	}

	/**
	 * Every tile the unit can reach from `start` with `movement` points, the
	 * start tile included at cost 0. `blocked` tiles are neither entered nor
	 * walked through.
	 */
	public static reachable(grid: GridData, start: GridPositionData, movement: number, blocked: ReadonlySet<string> = new Set()): ReachableTile[] {
		const { cost } = MovementSystem.floodFill(grid, start, movement, blocked);

		return [...cost].map(([key, spent]) => {
			const [column, row] = key.split(",").map(Number);
			return { column, row, cost: spent };
		});
	}

	/**
	 * The shortest route from `start` to `target`, both tiles included, or an
	 * empty array when `target` is out of reach. Ties are broken towards keeping
	 * the current heading, so the route runs straight where it can.
	 */
	public static path(grid: GridData, start: GridPositionData, target: GridPositionData, movement: number, blocked: ReadonlySet<string> = new Set()): GridPositionData[] {
		const { cost, cameFrom } = MovementSystem.floodFill(grid, start, movement, blocked);
		const targetKey = MovementSystem.tileKey(target.column, target.row);

		if (!cost.has(targetKey)) {
			return [];
		}

		const route: GridPositionData[] = [];

		for (let key: string | null = targetKey; key !== null; key = cameFrom.get(key) ?? null) {
			const [column, row] = key.split(",").map(Number);
			route.push({ column, row });
		}

		return route.reverse();
	}

	/**
	 * Every tile the unit could strike, given where it can move. A tile counts
	 * if it sits between `minRange` and `maxRange` (Manhattan) of any reachable
	 * tile and is not itself one the unit can move onto.
	 */
	public static attackable(grid: GridData, reachable: readonly ReachableTile[], minRange: number, maxRange: number): GridPositionData[] {
		const standable = new Set(reachable.map((tile) => MovementSystem.tileKey(tile.column, tile.row)));
		const targets = new Map<string, GridPositionData>();

		for (const tile of reachable) {
			for (let dc = -maxRange; dc <= maxRange; dc++) {
				for (let dr = -maxRange; dr <= maxRange; dr++) {
					const distance = Math.abs(dc) + Math.abs(dr);

					if (distance < minRange || distance > maxRange) {
						continue;
					}

					const column = tile.column + dc;
					const row = tile.row + dr;
					const key = MovementSystem.tileKey(column, row);

					if (standable.has(key) || targets.has(key)) {
						continue;
					}

					if (!GridSystem.containsTile(grid, column, row)) {
						continue;
					}

					targets.set(key, { column, row });
				}
			}
		}

		return [...targets.values()];
	}

	/** Whether `tiles` holds the given tile. */
	public static contains(tiles: readonly { column: number; row: number }[], column: number, row: number): boolean {
		return tiles.some((tile) => tile.column === column && tile.row === row);
	}

	/**
	 * Dijkstra outward from `start`, spending `movement` on the cost of entering
	 * each tile. Records the cheapest cost and the predecessor of every tile it
	 * settles, with equal-cost ties going to whichever approach keeps the path
	 * heading in a straight line.
	 */
	private static floodFill(grid: GridData, start: GridPositionData, movement: number, blocked: ReadonlySet<string>): FloodResult {
		const startKey = MovementSystem.tileKey(start.column, start.row);

		const cost = new Map<string, number>([[startKey, 0]]);
		const cameFrom = new Map<string, string | null>([[startKey, null]]);
		const heading = new Map<string, string>();

		// A plain array frontier: grids are small and movement budgets tiny, so
		// scanning for the cheapest node every step costs nothing.
		const frontier: ReachableTile[] = [{ column: start.column, row: start.row, cost: 0 }];

		while (frontier.length > 0) {
			let cheapest = 0;
			for (let index = 1; index < frontier.length; index++) {
				if (frontier[index].cost < frontier[cheapest].cost) {
					cheapest = index;
				}
			}

			const current = frontier.splice(cheapest, 1)[0];
			const currentKey = MovementSystem.tileKey(current.column, current.row);

			if (current.cost > (cost.get(currentKey) ?? Infinity)) {
				continue;
			}

			for (const neighbor of GridUtils.getNeighbors(current.column, current.row)) {
				const terrain = GridSystem.getTerrain(grid, neighbor.x, neighbor.y);

				if (terrain === null || !isPassable(terrain)) {
					continue;
				}

				const key = MovementSystem.tileKey(neighbor.x, neighbor.y);

				if (blocked.has(key)) {
					continue;
				}

				const stepCost = current.cost + getTerrainProperties(terrain).movementCost;

				if (stepCost > movement) {
					continue;
				}

				const known = cost.get(key) ?? Infinity;
				const direction = MovementSystem.tileKey(neighbor.x - current.column, neighbor.y - current.row);
				const straighter = stepCost === known && heading.get(currentKey) === direction;

				if (stepCost >= known && !straighter) {
					continue;
				}

				cost.set(key, stepCost);
				cameFrom.set(key, currentKey);
				heading.set(key, direction);

				if (stepCost < known) {
					frontier.push({ column: neighbor.x, row: neighbor.y, cost: stepCost });
				}
			}
		}

		return { cost, cameFrom };
	}
}
