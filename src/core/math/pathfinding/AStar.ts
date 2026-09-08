import { Vector2D } from "@/core/math/geometry/Vector2D";

/**
 * Represents a node in the pathfinding grid
 */
export interface AStarNode {
	/** Position in the grid */
	position: Vector2D;
	/** Is this node walkable? */
	walkable: boolean;
	/** Cost from start to this node */
	gCost: number;
	/** Estimated cost from this node to goal (heuristic) */
	hCost: number;
	/** Total cost (g + h) */
	fCost: number;
	/** Parent node in the path */
	parent: AStarNode | null;
}

/**
 * Options for pathfinding
 */
export interface AStarOptions {
	/** Allow diagonal movement? */
	allowDiagonal?: boolean;
	/** Cost of diagonal movement (typically ~1.4 for sqrt(2)) */
	diagonalCost?: number;
	/** Cost of straight movement */
	straightCost?: number;
	/** Maximum iterations before giving up (prevents infinite loops) */
	maxIterations?: number;
	/** Heuristic function (default: Manhattan distance) */
	heuristic?: (a: Vector2D, b: Vector2D) => number;
	/**
	 * Cost of *entering* a tile, when it is not the same for all of them - the
	 * rough ground / forest / swamp of a tactics map. It replaces
	 * `straightCost` / `diagonalCost` for the step it is asked about, and a
	 * non-finite value (`Infinity`) marks the tile as one that cannot be entered
	 * at all, on top of the grid's own walkability.
	 */
	cost?: (position: Vector2D) => number;
	/**
	 * Break equal-cost ties towards whichever approach keeps the current
	 * heading, so a route runs straight where it can instead of stair-stepping.
	 * Only affects which of two equally short routes comes back.
	 */
	preferStraight?: boolean;
}

/**
 * Result of a pathfinding operation
 */
export interface PathfindingResult {
	/** The path from start to goal (empty if no path found) */
	path: Vector2D[];
	/** Was a path found? */
	success: boolean;
	/** Number of nodes explored */
	nodesExplored: number;
	/** Length of the path */
	pathLength: number;
}

/** One tile of a [[ReachableArea]]: where it is and what it cost to get there. */
export interface ReachableNode {
	position: Vector2D;
	/** Total cost spent walking here from the start tile. */
	cost: number;
}

/**
 * Everything a flood fill settled: the tiles that came out within the budget,
 * what each of them cost, and the route back to the start for any of them.
 * `AStar.findReachable` builds it once, so a caller that needs both the range
 * and a route through it - a tactics map lighting up where a unit may go and
 * previewing how it walks there - only pays for the fill once.
 */
export class ReachableArea {
	constructor(
		private readonly costs: Map<string, number>,
		private readonly cameFrom: Map<string, string | null>
	) {}

	/** Every tile in reach, the start tile included at cost 0. */
	public getNodes(): ReachableNode[] {
		return [...this.costs].map(([key, cost]) => ({ position: parseKey(key), cost }));
	}

	public contains(position: Vector2D): boolean {
		return this.costs.has(toKey(position.x, position.y));
	}

	/** What reaching this tile costs, or null when it is out of reach. */
	public getCost(position: Vector2D): number | null {
		return this.costs.get(toKey(position.x, position.y)) ?? null;
	}

	/**
	 * The route from the start tile to `target`, both included, or an empty
	 * array when `target` was never reached.
	 */
	public pathTo(target: Vector2D): Vector2D[] {
		const targetKey = toKey(target.x, target.y);

		if (!this.costs.has(targetKey)) {
			return [];
		}

		const route: Vector2D[] = [];

		for (let key: string | null = targetKey; key !== null; key = this.cameFrom.get(key) ?? null) {
			route.push(parseKey(key));
		}

		return route.reverse();
	}
}

/** Grid positions are kept in the maps above as `"x,y"`, so they compare by value. */
function toKey(x: number, y: number): string {
	return `${x},${y}`;
}

function parseKey(key: string): Vector2D {
	const [x, y] = key.split(",").map(Number);
	return new Vector2D(x, y);
}

/** Every option filled in, except `cost` - which stays optional, because "no per-tile cost" is a meaning of its own. */
type ResolvedOptions = Required<Omit<AStarOptions, "cost">> & Pick<AStarOptions, "cost">;

/**
 * A* Pathfinding Algorithm
 *
 * Finds the shortest path from start to goal in a grid-based world.
 *
 * How it works:
 * 1. Start at the beginning node
 * 2. Check all neighbors, calculate their costs
 * 3. Always explore the node with lowest f-cost (g + h)
 * 4. Repeat until goal is reached or no path exists
 *
 * Common use cases:
 * - Enemy AI navigation (zombies chasing player)
 * - Tower Defense (creeps finding path to base)
 * - RTS unit movement (soldiers avoiding obstacles)
 * - Click-to-move games (Diablo-style)
 * - Puzzle games (checking if goal is reachable)
 * - NPC navigation in dungeons/levels
 */
export class AStar {
	private grid: AStarNode[][];
	private width: number;
	private height: number;
	private defaultOptions: ResolvedOptions;

	/**
	 * Creates a new A* pathfinder
	 * @param width - Grid width
	 * @param height - Grid height
	 * @param defaultOptions - Default pathfinding options
	 */
	constructor(width: number, height: number, defaultOptions?: AStarOptions) {
		this.width = width;
		this.height = height;
		this.defaultOptions = {
			allowDiagonal: defaultOptions?.allowDiagonal ?? true,
			diagonalCost: defaultOptions?.diagonalCost ?? 1.414, // sqrt(2)
			straightCost: defaultOptions?.straightCost ?? 1,
			maxIterations: defaultOptions?.maxIterations ?? 10000,
			heuristic: defaultOptions?.heuristic ?? this.manhattanDistance.bind(this),
			cost: defaultOptions?.cost,
			preferStraight: defaultOptions?.preferStraight ?? false
		};

		this.grid = this.createGrid();
	}

	/**
	 * Creates a pathfinder from a 2D walkability map
	 * @param walkableMap - 2D array where true = walkable, false = obstacle
	 */
	public static fromMap(walkableMap: boolean[][]): AStar {
		const height = walkableMap.length;
		const width = walkableMap[0]?.length ?? 0;

		const aStar = new AStar(width, height);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				aStar.setWalkable(x, y, walkableMap[y][x]);
			}
		}

		return aStar;
	}

	/**
	 * Finds a path from start to goal
	 */
	public findPath(start: Vector2D, goal: Vector2D, options?: AStarOptions): PathfindingResult {
		const opts = { ...this.defaultOptions, ...options };

		// Validate positions
		if (!this.isValid(start) || !this.isValid(goal)) {
			return { path: [], success: false, nodesExplored: 0, pathLength: 0 };
		}

		const startNode = this.getNode(start);
		const goalNode = this.getNode(goal);

		if (!startNode.walkable || !goalNode.walkable) {
			return { path: [], success: false, nodesExplored: 0, pathLength: 0 };
		}

		// Reset all nodes
		this.resetNodes();

		const openList: AStarNode[] = [];
		const closedList: Set<AStarNode> = new Set();

		openList.push(startNode);
		startNode.gCost = 0;
		startNode.hCost = opts.heuristic(start, goal);
		startNode.fCost = startNode.hCost;

		let iterations = 0;

		while (openList.length > 0 && iterations < opts.maxIterations) {
			iterations++;

			// Get node with lowest f-cost
			const currentNode = this.getLowestFCostNode(openList);

			// Remove from open list
			const index = openList.indexOf(currentNode);
			openList.splice(index, 1);

			// Add to closed list
			closedList.add(currentNode);

			// Goal reached!
			if (currentNode === goalNode) {
				const path = this.reconstructPath(currentNode);
				return {
					path,
					success: true,
					nodesExplored: closedList.size,
					pathLength: path.length
				};
			}

			// Check all neighbors
			const neighbors = this.getNeighbors(currentNode, opts);

			for (const neighbor of neighbors) {
				if (!neighbor.walkable || closedList.has(neighbor)) {
					continue;
				}

				// Cost of entering the neighbour: the per-tile cost when one was
				// given, the straight / diagonal step cost otherwise.
				const movementCost = this.stepCost(currentNode, neighbor, opts);

				if (!Number.isFinite(movementCost)) {
					continue;
				}

				const tentativeGCost = currentNode.gCost + movementCost;

				const isInOpenList = openList.includes(neighbor);
				const straighter = opts.preferStraight && tentativeGCost === neighbor.gCost && this.keepsHeading(currentNode, neighbor);

				if (!isInOpenList || tentativeGCost < neighbor.gCost || straighter) {
					// This path to neighbor is better
					neighbor.parent = currentNode;
					neighbor.gCost = tentativeGCost;
					neighbor.hCost = opts.heuristic(neighbor.position, goal);
					neighbor.fCost = neighbor.gCost + neighbor.hCost;

					if (!isInOpenList) {
						openList.push(neighbor);
					}
				}
			}
		}

		// No path found
		return { path: [], success: false, nodesExplored: closedList.size, pathLength: 0 };
	}

	/**
	 * Everything within `budget` of `start` - the movement range of a tactics
	 * unit, the blast radius of a spell, the tiles an enemy could close on this
	 * turn. A Dijkstra flood outward that spends the budget on the cost of
	 * entering each tile (see `AStarOptions.cost`), so it stops early on rough
	 * ground and never enters what it cannot afford.
	 *
	 * The [[ReachableArea]] it hands back also holds the route to every tile it
	 * settled, so a range and the path through it come out of one fill.
	 */
	public findReachable(start: Vector2D, budget: number, options?: AStarOptions): ReachableArea {
		const opts = { ...this.defaultOptions, ...options };

		const costs = new Map<string, number>();
		const cameFrom = new Map<string, string | null>();

		if (!this.isValid(start) || !this.getNode(start).walkable) {
			return new ReachableArea(costs, cameFrom);
		}

		const startKey = toKey(start.x, start.y);
		costs.set(startKey, 0);
		cameFrom.set(startKey, null);

		// Which way the route arrived on a tile, for the straight-line tie-break.
		const heading = new Map<string, string>();

		// A plain array frontier: a budgeted fill settles a handful of tiles, so
		// scanning it for the cheapest one costs less than a heap would.
		const frontier: ReachableNode[] = [{ position: start, cost: 0 }];

		while (frontier.length > 0) {
			let cheapest = 0;

			for (let index = 1; index < frontier.length; index++) {
				if (frontier[index].cost < frontier[cheapest].cost) {
					cheapest = index;
				}
			}

			const current = frontier.splice(cheapest, 1)[0];
			const currentKey = toKey(current.position.x, current.position.y);

			if (current.cost > (costs.get(currentKey) ?? Infinity)) {
				continue;
			}

			const currentNode = this.getNode(current.position);

			for (const neighbor of this.getNeighbors(currentNode, opts)) {
				const movementCost = this.stepCost(currentNode, neighbor, opts);

				if (!neighbor.walkable || !Number.isFinite(movementCost)) {
					continue;
				}

				const cost = current.cost + movementCost;

				if (cost > budget) {
					continue;
				}

				const key = toKey(neighbor.position.x, neighbor.position.y);
				const known = costs.get(key) ?? Infinity;
				const direction = this.headingOf(current.position, neighbor.position);
				const straighter = opts.preferStraight && cost === known && heading.get(currentKey) === direction;

				if (cost >= known && !straighter) {
					continue;
				}

				costs.set(key, cost);
				cameFrom.set(key, currentKey);
				heading.set(key, direction);

				if (cost < known) {
					frontier.push({ position: neighbor.position, cost });
				}
			}
		}

		return new ReachableArea(costs, cameFrom);
	}

	/**
	 * Sets whether a position is walkable
	 */
	public setWalkable(x: number, y: number, walkable: boolean): void {
		if (this.isInBounds(x, y)) {
			this.grid[y][x].walkable = walkable;
		}
	}

	/**
	 * Checks if a position is walkable
	 */
	public isWalkable(x: number, y: number): boolean {
		return this.isInBounds(x, y) && this.grid[y][x].walkable;
	}

	/**
	 * Sets a rectangular area as walkable/unwalkable
	 */
	public setArea(x: number, y: number, width: number, height: number, walkable: boolean): void {
		for (let dy = 0; dy < height; dy++) {
			for (let dx = 0; dx < width; dx++) {
				this.setWalkable(x + dx, y + dy, walkable);
			}
		}
	}

	/**
	 * Clears all obstacles (makes everything walkable)
	 */
	public clear(): void {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				this.grid[y][x].walkable = true;
			}
		}
	}

	/**
	 * Gets the grid dimensions
	 */
	public getDimensions(): { width: number; height: number } {
		return { width: this.width, height: this.height };
	}

	// ============================================================================
	// HEURISTIC FUNCTIONS
	// ============================================================================

	/**
	 * Manhattan distance (good for grid-based movement, no diagonals)
	 */
	public manhattanDistance(a: Vector2D, b: Vector2D): number {
		return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
	}

	/**
	 * Euclidean distance (straight-line distance, good for diagonal movement)
	 */
	public euclideanDistance(a: Vector2D, b: Vector2D): number {
		return a.distanceBetween(b);
	}

	/**
	 * Chebyshev distance (good for 8-directional movement)
	 */
	public chebyshevDistance(a: Vector2D, b: Vector2D): number {
		return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
	}

	/**
	 * Diagonal distance (octile distance)
	 */
	public diagonalDistance(a: Vector2D, b: Vector2D): number {
		const dx = Math.abs(a.x - b.x);
		const dy = Math.abs(a.y - b.y);
		return Math.max(dx, dy) + (1.414 - 1) * Math.min(dx, dy);
	}

	// ============================================================================
	// PRIVATE METHODS
	// ============================================================================

	private createGrid(): AStarNode[][] {
		const grid: AStarNode[][] = [];

		for (let y = 0; y < this.height; y++) {
			grid[y] = [];
			for (let x = 0; x < this.width; x++) {
				grid[y][x] = {
					position: new Vector2D(x, y),
					walkable: true,
					gCost: Infinity,
					hCost: 0,
					fCost: Infinity,
					parent: null
				};
			}
		}

		return grid;
	}

	private resetNodes(): void {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const node = this.grid[y][x];
				node.gCost = Infinity;
				node.hCost = 0;
				node.fCost = Infinity;
				node.parent = null;
			}
		}
	}

	private getNode(position: Vector2D): AStarNode {
		return this.grid[Math.floor(position.y)][Math.floor(position.x)];
	}

	private isValid(position: Vector2D): boolean {
		return this.isInBounds(Math.floor(position.x), Math.floor(position.y));
	}

	private isInBounds(x: number, y: number): boolean {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	private getNeighbors(node: AStarNode, options: ResolvedOptions): AStarNode[] {
		const neighbors: AStarNode[] = [];
		const { x, y } = node.position;

		// Cardinal directions (up, down, left, right)
		const directions = [
			{ dx: 0, dy: -1 }, // Up
			{ dx: 0, dy: 1 }, // Down
			{ dx: -1, dy: 0 }, // Left
			{ dx: 1, dy: 0 } // Right
		];

		// Diagonal directions
		if (options.allowDiagonal) {
			directions.push(
				{ dx: -1, dy: -1 }, // Up-Left
				{ dx: 1, dy: -1 }, // Up-Right
				{ dx: -1, dy: 1 }, // Down-Left
				{ dx: 1, dy: 1 } // Down-Right
			);
		}

		for (const { dx, dy } of directions) {
			const nx = Math.floor(x) + dx;
			const ny = Math.floor(y) + dy;

			if (this.isInBounds(nx, ny)) {
				neighbors.push(this.grid[ny][nx]);
			}
		}

		return neighbors;
	}

	/**
	 * What entering `neighbor` from `node` costs: the per-tile cost when one was
	 * given, otherwise the straight or diagonal step cost. `Infinity` (or any
	 * non-finite value) means the tile cannot be entered.
	 */
	private stepCost(node: AStarNode, neighbor: AStarNode, options: ResolvedOptions): number {
		if (options.cost) {
			return options.cost(neighbor.position);
		}

		return this.isDiagonal(node.position, neighbor.position) ? options.diagonalCost : options.straightCost;
	}

	/** The direction of a single step, as a key that compares by value. */
	private headingOf(from: Vector2D, to: Vector2D): string {
		return toKey(to.x - from.x, to.y - from.y);
	}

	/** Whether stepping from `node` on to `neighbor` carries on the way `node` was reached. */
	private keepsHeading(node: AStarNode, neighbor: AStarNode): boolean {
		if (node.parent === null) {
			return false;
		}

		return this.headingOf(node.parent.position, node.position) === this.headingOf(node.position, neighbor.position);
	}

	private isDiagonal(a: Vector2D, b: Vector2D): boolean {
		return a.x !== b.x && a.y !== b.y;
	}

	private getLowestFCostNode(list: AStarNode[]): AStarNode {
		let lowest = list[0];

		for (let i = 1; i < list.length; i++) {
			const node = list[i];
			if (node.fCost < lowest.fCost || (node.fCost === lowest.fCost && node.hCost < lowest.hCost)) {
				lowest = node;
			}
		}

		return lowest;
	}

	private reconstructPath(goalNode: AStarNode): Vector2D[] {
		const path: Vector2D[] = [];
		let currentNode: AStarNode | null = goalNode;

		while (currentNode !== null) {
			path.unshift(new Vector2D(currentNode.position.x, currentNode.position.y));
			currentNode = currentNode.parent;
		}

		return path;
	}
}
