import { AStar, ReachableArea } from "@/core/math/pathfinding/AStar";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GridData } from "@/game/map/components/GridComponent";
import { GridPositionData } from "@/game/map/components/GridPositionComponent";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { getTerrainProperties, IMPASSABLE, isPassable } from "@/game/map/model/Terrain";
import { UnitLocation } from "@/game/units/systems/UnitSystem";

/** A tile a unit can stand on, with the movement it costs to get there. */
export interface ReachableTile {
	column: number;
	row: number;
	/** Total terrain cost spent walking here from the start tile. */
	cost: number;
}

/**
 * One pathfinder per map size, reused across queries. The grid itself carries
 * nothing query-specific - which tiles are passable and what they cost is
 * answered by the callback handed to every call - so a battle only ever builds
 * one of these however often the cursor moves.
 */
const pathfinders = new Map<string, AStar>();

function pathfinderFor(grid: GridData): AStar {
	const key = `${grid.columns}x${grid.rows}`;
	const known = pathfinders.get(key);

	if (known !== undefined) {
		return known;
	}

	const pathfinder = new AStar(grid.columns, grid.rows, { allowDiagonal: false, preferStraight: true });
	pathfinders.set(key, pathfinder);

	return pathfinder;
}

/**
 * Pure movement math for units on a battle grid, kept off the components the
 * same way `GridSystem` is: no queries, no World, so a feature, a system or a
 * test can call it directly.
 *
 * Movement works the Fire Emblem way - a flood fill outward from the unit that
 * spends the class's movement points on the cost of *entering* each tile, stops
 * at impassable terrain and cannot pass through a tile an enemy occupies. An
 * ally is different: the unit walks straight through its own side, it just
 * cannot end the move on top of anyone.
 * The fill itself is `AStar.findReachable`; everything here is the rules it is
 * given - what a tile costs, who blocks it - and the tile shapes the game reads
 * back. `path` walks the same fill back to a target for the shortest route; the
 * attack range is every tile within weapon reach of somewhere the unit could
 * move to.
 */
export class MovementSystem {
	/** Stable string key for a tile, for the sets the callers pass around. */
	public static tileKey(column: number, row: number): string {
		return `${column},${row}`;
	}

	/**
	 * Tiles the mover can neither enter nor walk through: those held by a unit
	 * of another faction. Its own side never bars the way - see `occupiedTiles`
	 * for what allies do.
	 */
	public static blockedTiles(units: readonly UnitLocation[], mover: Pick<UnitLocation, "id" | "faction">): ReadonlySet<string> {
		const blocked = new Set<string>();

		for (const unit of units) {
			if (unit.id === mover.id || unit.faction === mover.faction) {
				continue;
			}

			blocked.add(MovementSystem.tileKey(unit.column, unit.row));
		}

		return blocked;
	}

	/**
	 * Tiles the mover can walk through but not stop on: every one another unit
	 * is standing on, ally or enemy. Enemies are in `blockedTiles` as well, so
	 * for the fill only the allies among these make a difference.
	 */
	public static occupiedTiles(units: readonly UnitLocation[], mover: string): ReadonlySet<string> {
		const occupied = new Set<string>();

		for (const unit of units) {
			if (unit.id === mover) {
				continue;
			}

			occupied.add(MovementSystem.tileKey(unit.column, unit.row));
		}

		return occupied;
	}

	/**
	 * Every tile the unit can end a move on from `start` with `movement` points,
	 * the start tile included at cost 0. `blocked` tiles are neither entered nor
	 * walked through; `occupied` tiles are walked through but left out of the
	 * result - an ally in the way is passed, never landed on.
	 */
	public static reachable(grid: GridData, start: GridPositionData, movement: number, blocked: ReadonlySet<string> = new Set(), occupied: ReadonlySet<string> = new Set()): ReachableTile[] {
		return MovementSystem.flood(grid, start, movement, blocked)
			.getNodes()
			.filter((node) => !occupied.has(MovementSystem.tileKey(node.position.x, node.position.y)))
			.map((node) => ({ column: node.position.x, row: node.position.y, cost: node.cost }));
	}

	/**
	 * The shortest route from `start` to `target`, both tiles included, or an
	 * empty array when `target` is out of reach. Ties are broken towards keeping
	 * the current heading, so the route runs straight where it can.
	 */
	public static path(grid: GridData, start: GridPositionData, target: GridPositionData, movement: number, blocked: ReadonlySet<string> = new Set()): GridPositionData[] {
		return MovementSystem.flood(grid, start, movement, blocked)
			.pathTo(new Vector2D(target.column, target.row))
			.map((position) => ({ column: position.x, row: position.y }));
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
	 * What it costs this unit to step on to a tile: the terrain's movement cost,
	 * or `IMPASSABLE` for terrain no one can enter and for a tile an enemy is
	 * standing on - which is what stops the fill walking through either.
	 */
	public static entryCost(grid: GridData, blocked: ReadonlySet<string>, column: number, row: number): number {
		const terrain = GridSystem.getTerrain(grid, column, row);

		if (terrain === null || !isPassable(terrain) || blocked.has(MovementSystem.tileKey(column, row))) {
			return IMPASSABLE;
		}

		return getTerrainProperties(terrain).movementCost;
	}

	/** The flood fill both `reachable` and `path` read, run against this grid's terrain and blockers. */
	private static flood(grid: GridData, start: GridPositionData, movement: number, blocked: ReadonlySet<string>): ReachableArea {
		return pathfinderFor(grid).findReachable(new Vector2D(start.column, start.row), movement, {
			cost: (position) => MovementSystem.entryCost(grid, blocked, position.x, position.y)
		});
	}
}
