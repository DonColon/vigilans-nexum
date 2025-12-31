import { fillTuple } from "@/core/utils/Arrays";
import { Shape } from "@/core/math/geometry/Shape";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";

export class Polygon implements Shape {
	private readonly vertices: Vector2D[];

	constructor(vertices: Vector2D[] = []) {
		this.vertices = vertices;
	}

	public static buildConvexHull(points: Vector2D[]): Polygon {
		const polygon = new Polygon();
		const start = this.findStartingPoint(points);
		const used = fillTuple(false, points.length);
		let previous = start;

		do {
			const next = this.findNextPoint(points, previous, used);
			previous = next;
			used[previous] = true;
			polygon.addVertex(points[previous]);
		} while (start !== previous);

		return polygon;
	}

	private static findStartingPoint(points: Vector2D[]): number {
		let previous = 0;
		for (let current = 1; current < points.length; current++) {
			if (points[current].x < points[previous].x) {
				previous = current;
			}
		}
		return previous;
	}

	private static findNextPoint(points: Vector2D[], previous: number, used: boolean[]): number {
		let next = -1;
		let max = 0;

		for (let current = 0; current < points.length; current++) {
			if (current === previous || used[current]) continue;

			if (next === -1) next = current;

			const vector = points[previous].subtract(points[current]);
			const other = points[previous].subtract(points[next]);

			const distance = points[previous].distanceBetween(points[current]);
			const result = vector.perpDot(other);

			if (result === 0) {
				if (distance > max) {
					next = current;
					max = distance;
				}
			} else if (result < 0) {
				next = current;
				max = distance;
			}
		}

		return next;
	}

	public contains(point: Vector2D): boolean {
		let contains = false;

		for (let current = 1; current < this.vertices.length; current++) {
			const next = (current + 1) % this.vertices.length;

			const vector = this.vertices[current];
			const other = this.vertices[next];

			const result = ((other.x - vector.x) * (point.y - vector.y)) / (other.y - vector.y) + vector.x;

			if ((vector.y >= point.y && other.y < point.y) || (vector.y < point.y && other.y >= point.y && point.x < result)) {
				contains = !contains;
			}
		}

		return contains;
	}

	public intersects(other: Shape): boolean {
		let intersects = false;

		if (other === null) return intersects;

		for (const side of this.getSides()) {
			if (other.intersects(side)) {
				intersects = true;
			}
		}

		return intersects;
	}

	public getArea(): number {
		let area = 0;

		for (let current = 1; current < this.vertices.length; current++) {
			const next = (current + 1) % this.vertices.length;

			const vector = this.vertices[0].subtract(this.vertices[current]);
			const other = this.vertices[0].subtract(this.vertices[next]);

			const result = vector.perpDot(other);
			area += result;
		}

		return Math.abs(area) / 2;
	}

	public getPerimeter(): number {
		let perimeter = 0;

		for (let current = 0; current < this.vertices.length; current++) {
			const next = (current + 1) % this.vertices.length;

			const distance = this.vertices[current].distanceBetween(this.vertices[next]);
			perimeter += distance;
		}

		return perimeter;
	}

	public getSides(): Line[] {
		const sides: Line[] = [];

		for (let current = 0; current < this.vertices.length; current++) {
			const next = (current + 1) % this.vertices.length;

			const start = this.vertices[current];
			const end = this.vertices[next];

			const side = Line.ofPoints(start, end);
			sides.push(side);
		}

		return sides;
	}

	public getBounds(): Rectangle {
		if (this.vertices.length === 0) {
            return new Rectangle(0, 0, 0, 0);
        }

        let minX = this.vertices[0].x;
        let minY = this.vertices[0].y;
        let maxX = this.vertices[0].x;
        let maxY = this.vertices[0].y;

        for (let i = 1; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
        }

        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
	}

	public addVertex(vertex: Vector2D): this {
		this.vertices.push(vertex);
		return this;
	}

	public removeVertex(index: number) {
		if (index < 0 || index >= this.vertices.length) return;
		this.vertices.splice(index, 1);
	}

	public getVertex(index: number): Vector2D {
		return index < 0 || index >= this.vertices.length ? new Vector2D(NaN, NaN) : this.vertices[index];
	}

	public getVertices(): Vector2D[] {
		return [...this.vertices];
	}
}
