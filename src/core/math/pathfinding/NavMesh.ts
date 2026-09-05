import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Rectangle } from "@/core/math/geometry/Rectangle";

/**
 * Simple navigation polygon
 */
export class NavPolygon {
	public readonly id: number;
	public readonly vertices: Vector2D[];
	public readonly center: Vector2D;
	public readonly neighbors: Set<number> = new Set();

	constructor(id: number, vertices: Vector2D[]) {
		this.id = id;
		this.vertices = [...vertices];
		this.center = this.calculateCenter(vertices);
	}

	private calculateCenter(vertices: Vector2D[]): Vector2D {
		let x = 0,
			y = 0;
		for (const v of vertices) {
			x += v.x;
			y += v.y;
		}
		return new Vector2D(x / vertices.length, y / vertices.length);
	}

	public contains(point: Vector2D): boolean {
		// Simple point-in-polygon test
		let inside = false;
		const n = this.vertices.length;

		for (let i = 0, j = n - 1; i < n; j = i++) {
			const vi = this.vertices[i];
			const vj = this.vertices[j];

			if (vi.y > point.y !== vj.y > point.y && point.x < ((vj.x - vi.x) * (point.y - vi.y)) / (vj.y - vi.y) + vi.x) {
				inside = !inside;
			}
		}

		return inside;
	}
}

/**
 * Simple Navigation Mesh - Easy to use, good for most 2D games.
 *
 * Usage:
 * 1. Create NavMesh
 * 2. Add walkable rectangles/polygons
 * 3. Build connections
 * 4. Find paths!
 */
export class NavMesh {
	private polygons = new Map<number, NavPolygon>();
	private nextId = 0;

	/**
	 * Creates NavMesh from rectangles (easiest way!)
	 */
	public static fromRectangles(rects: Rectangle[]): NavMesh {
		const mesh = new NavMesh();

		for (const rect of rects) {
			const c = rect.getCorners();
			mesh.addPolygon([c.topLeft, c.topRight, c.bottomRight, c.bottomLeft]);
		}

		mesh.connect();
		return mesh;
	}

	/**
	 * Creates NavMesh from a grid
	 */
	public static fromGrid(grid: boolean[][], cellSize: number = 32): NavMesh {
		const mesh = new NavMesh();

		for (let y = 0; y < grid.length; y++) {
			for (let x = 0; x < grid[0].length; x++) {
				if (grid[y][x]) {
					const x1 = x * cellSize;
					const y1 = y * cellSize;
					const x2 = (x + 1) * cellSize;
					const y2 = (y + 1) * cellSize;

					mesh.addPolygon([new Vector2D(x1, y1), new Vector2D(x2, y1), new Vector2D(x2, y2), new Vector2D(x1, y2)]);
				}
			}
		}

		mesh.connect();
		return mesh;
	}

	/**
	 * Adds a polygon to the mesh
	 */
	public addPolygon(vertices: Vector2D[]): number {
		const id = this.nextId++;
		this.polygons.set(id, new NavPolygon(id, vertices));
		return id;
	}

	/**
	 * Connects neighboring polygons (call after adding all polygons)
	 */
	public connect(): void {
		const polys = Array.from(this.polygons.values());

		for (let i = 0; i < polys.length; i++) {
			for (let j = i + 1; j < polys.length; j++) {
				if (this.areNeighbors(polys[i], polys[j])) {
					polys[i].neighbors.add(polys[j].id);
					polys[j].neighbors.add(polys[i].id);
				}
			}
		}
	}

	/**
	 * Finds path from start to goal
	 */
	public findPath(start: Vector2D, goal: Vector2D): Vector2D[] {
		// Find polygons
		const startPoly = this.getPolyAt(start);
		const goalPoly = this.getPolyAt(goal);

		if (!startPoly || !goalPoly) {
			return []; // No path
		}

		if (startPoly.id === goalPoly.id) {
			return [start, goal]; // Same polygon
		}

		// A* through polygons
		const polyPath = this.findPolygonPath(startPoly, goalPoly);

		if (polyPath.length === 0) {
			return [];
		}

		// Convert to position path
		return this.makePositionPath(start, goal, polyPath);
	}

	/**
	 * Checks if point is walkable
	 */
	public isWalkable(point: Vector2D): boolean {
		return this.getPolyAt(point) !== null;
	}

	/**
	 * Gets polygon at position
	 */
	public getPolyAt(point: Vector2D): NavPolygon | null {
		for (const poly of this.polygons.values()) {
			if (poly.contains(point)) {
				return poly;
			}
		}
		return null;
	}

	// ============================================================================
	// PRIVATE HELPERS (Simple A*)
	// ============================================================================

	private areNeighbors(p1: NavPolygon, p2: NavPolygon): boolean {
		// Polygons are neighbours when they share a vertex
		for (const v1 of p1.vertices) {
			for (const v2 of p2.vertices) {
				if (v1.distanceBetween(v2) < 1) {
					return true; // Share vertex
				}
			}
		}

		return false;
	}

	private findPolygonPath(start: NavPolygon, goal: NavPolygon): NavPolygon[] {
		const openSet = new Set([start.id]);
		const cameFrom = new Map<number, number>();
		const gScore = new Map<number, number>();
		const fScore = new Map<number, number>();

		gScore.set(start.id, 0);
		fScore.set(start.id, this.heuristic(start, goal));

		while (openSet.size > 0) {
			// Get lowest f-score
			let current: number | null = null;
			let lowestF = Infinity;

			for (const id of openSet) {
				const f = fScore.get(id) ?? Infinity;
				if (f < lowestF) {
					lowestF = f;
					current = id;
				}
			}

			if (current === null) break;

			if (current === goal.id) {
				// Reconstruct path
				return this.reconstructPath(cameFrom, current);
			}

			openSet.delete(current);
			const currentPoly = this.polygons.get(current)!;

			for (const neighborId of currentPoly.neighbors) {
				const neighbor = this.polygons.get(neighborId)!;
				const tentativeG = (gScore.get(current) ?? Infinity) + currentPoly.center.distanceBetween(neighbor.center);

				if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
					cameFrom.set(neighborId, current);
					gScore.set(neighborId, tentativeG);
					fScore.set(neighborId, tentativeG + this.heuristic(neighbor, goal));
					openSet.add(neighborId);
				}
			}
		}

		return []; // No path
	}

	private reconstructPath(cameFrom: Map<number, number>, current: number): NavPolygon[] {
		const path = [this.polygons.get(current)!];

		while (cameFrom.has(current)) {
			current = cameFrom.get(current)!;
			path.unshift(this.polygons.get(current)!);
		}

		return path;
	}

	private makePositionPath(start: Vector2D, goal: Vector2D, polyPath: NavPolygon[]): Vector2D[] {
		// Simple: just use polygon centers
		const path = [start];

		for (let i = 1; i < polyPath.length; i++) {
			path.push(polyPath[i].center);
		}

		path.push(goal);
		return path;
	}

	private heuristic(a: NavPolygon, b: NavPolygon): number {
		return a.center.distanceBetween(b.center);
	}
}
