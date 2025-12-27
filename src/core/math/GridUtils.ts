import { Vector } from "core/math/Vector";

/**
 * Utilities for grid-based games and tile operations.
 * 
 * Use cases:
 * - Tile-based games (RPG, Tactics, Puzzle)
 * - Click-to-grid conversion
 * - Neighbor finding
 * - Line of sight
 * - Area of effect
 * - Hex grids
 * - Isometric grids
 */
export class GridUtils {
    /**
     * Converts world position to grid coordinates
     */
    public static worldToGrid(worldPos: Vector, cellSize: number): Vector {
        return new Vector(
            Math.floor(worldPos.x / cellSize),
            Math.floor(worldPos.y / cellSize)
        );
    }

    /**
     * Converts grid coordinates to world position (center of cell)
     */
    public static gridToWorld(gridPos: Vector, cellSize: number): Vector {
        return new Vector(
            gridPos.x * cellSize + cellSize / 2,
            gridPos.y * cellSize + cellSize / 2
        );
    }

    /**
     * Converts grid coordinates to world position (top-left of cell)
     */
    public static gridToWorldTopLeft(gridPos: Vector, cellSize: number): Vector {
        return new Vector(
            gridPos.x * cellSize,
            gridPos.y * cellSize
        );
    }

    /**
     * Gets all neighboring cells (4-directional or 8-directional)
     */
    public static getNeighbors(x: number, y: number, includeDiagonals: boolean = false): Vector[] {
        const neighbors: Vector[] = [
            new Vector(x, y - 1),     // Up
            new Vector(x + 1, y),     // Right
            new Vector(x, y + 1),     // Down
            new Vector(x - 1, y)      // Left
        ];

        if (includeDiagonals) {
            neighbors.push(
                new Vector(x - 1, y - 1), // Up-Left
                new Vector(x + 1, y - 1), // Up-Right
                new Vector(x + 1, y + 1), // Down-Right
                new Vector(x - 1, y + 1)  // Down-Left
            );
        }

        return neighbors;
    }

    /**
     * Manhattan distance (for 4-directional movement)
     */
    public static manhattanDistance(a: Vector, b: Vector): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Chebyshev distance (for 8-directional movement)
     */
    public static chebyshevDistance(a: Vector, b: Vector): number {
        return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    }

    /**
     * Bresenham's line algorithm - returns all grid cells along a line
     */
    public static bresenhamLine(start: Vector, end: Vector): Vector[] {
        const cells: Vector[] = [];
        
        let x0 = Math.floor(start.x);
        let y0 = Math.floor(start.y);
        const x1 = Math.floor(end.x);
        const y1 = Math.floor(end.y);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            cells.push(new Vector(x0, y0));

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return cells;
    }

    /**
     * Gets all cells in a circle (radius in grid cells)
     */
    public static getCircle(center: Vector, radius: number): Vector[] {
        const cells: Vector[] = [];
        const radiusSquared = radius * radius;

        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                if (x * x + y * y <= radiusSquared) {
                    cells.push(new Vector(center.x + x, center.y + y));
                }
            }
        }

        return cells;
    }

    /**
     * Gets all cells in a rectangle
     */
    public static getRectangle(topLeft: Vector, width: number, height: number): Vector[] {
        const cells: Vector[] = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                cells.push(new Vector(topLeft.x + x, topLeft.y + y));
            }
        }

        return cells;
    }

    /**
     * Gets all cells in a ring around center
     */
    public static getRing(center: Vector, radius: number): Vector[] {
        const cells: Vector[] = [];
        const allInRadius = this.getCircle(center, radius);
        const allInInnerRadius = this.getCircle(center, radius - 1);
        
        const innerSet = new Set(allInInnerRadius.map(v => `${v.x},${v.y}`));
        
        for (const cell of allInRadius) {
            if (!innerSet.has(`${cell.x},${cell.y}`)) {
                cells.push(cell);
            }
        }

        return cells;
    }

    // ============================================================================
    // HEX GRID UTILITIES (Flat-Top Hexagons)
    // ============================================================================

    /**
     * Gets all 6 neighbors of a hex cell (flat-top orientation)
     */
    public static hexNeighbors(x: number, y: number): Vector[] {
        const parity = y % 2;
        
        return [
            new Vector(x, y - 1),           // Top
            new Vector(x, y + 1),           // Bottom
            new Vector(x - 1, y),           // Left
            new Vector(x + 1, y),           // Right
            new Vector(x + parity - 1, y - 1), // Top-Left
            new Vector(x + parity, y - 1),     // Top-Right
            new Vector(x + parity - 1, y + 1), // Bottom-Left
            new Vector(x + parity, y + 1)      // Bottom-Right
        ].slice(0, 6); // Adjust based on offset coord system
    }

    /**
     * Hex distance (uses cube coordinates conversion)
     */
    public static hexDistance(a: Vector, b: Vector): number {
        // Convert offset to cube coordinates
        const [ax, ay, az] = this.offsetToCube(a.x, a.y);
        const [bx, by, bz] = this.offsetToCube(b.x, b.y);
        
        return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
    }

    private static offsetToCube(col: number, row: number): [number, number, number] {
        const x = col - (row - (row % 2)) / 2;
        const z = row;
        const y = -x - z;
        return [x, y, z];
    }

    // ============================================================================
    // ISOMETRIC UTILITIES
    // ============================================================================

    /**
     * Converts world coordinates to isometric coordinates
     */
    public static worldToIsometric(worldPos: Vector): Vector {
        return new Vector(
            worldPos.x - worldPos.y,
            (worldPos.x + worldPos.y) / 2
        );
    }

    /**
     * Converts isometric coordinates to world coordinates
     */
    public static isometricToWorld(isoPos: Vector): Vector {
        return new Vector(
            (isoPos.x + isoPos.y * 2) / 2,
            (isoPos.y * 2 - isoPos.x) / 2
        );
    }

    /**
     * Checks if a grid position is valid within bounds
     */
    public static isInBounds(pos: Vector, width: number, height: number): boolean {
        return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
    }
}