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
    private defaultOptions: Required<AStarOptions>;

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
            heuristic: defaultOptions?.heuristic ?? this.manhattanDistance.bind(this)
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

                // Calculate cost to neighbor
                const isDiagonal = this.isDiagonal(currentNode.position, neighbor.position);
                const movementCost = isDiagonal ? opts.diagonalCost : opts.straightCost;
                const tentativeGCost = currentNode.gCost + movementCost;

                const isInOpenList = openList.includes(neighbor);

                if (!isInOpenList || tentativeGCost < neighbor.gCost) {
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

    private getNeighbors(node: AStarNode, options: Required<AStarOptions>): AStarNode[] {
        const neighbors: AStarNode[] = [];
        const { x, y } = node.position;

        // Cardinal directions (up, down, left, right)
        const directions = [
            { dx: 0, dy: -1 },  // Up
            { dx: 0, dy: 1 },   // Down
            { dx: -1, dy: 0 },  // Left
            { dx: 1, dy: 0 }    // Right
        ];

        // Diagonal directions
        if (options.allowDiagonal) {
            directions.push(
                { dx: -1, dy: -1 }, // Up-Left
                { dx: 1, dy: -1 },  // Up-Right
                { dx: -1, dy: 1 },  // Down-Left
                { dx: 1, dy: 1 }    // Down-Right
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

    private isDiagonal(a: Vector2D, b: Vector2D): boolean {
        return a.x !== b.x && a.y !== b.y;
    }

    private getLowestFCostNode(list: AStarNode[]): AStarNode {
        let lowest = list[0];
        
        for (let i = 1; i < list.length; i++) {
            const node = list[i];
            if (node.fCost < lowest.fCost || 
                (node.fCost === lowest.fCost && node.hCost < lowest.hCost)) {
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