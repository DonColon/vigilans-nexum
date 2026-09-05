import { Angle } from "@/core/math/geometry/Angle";
import { Shape } from "@/core/math/geometry/Shape";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Circle } from "@/core/math/geometry/Circle";
import { Ellipse } from "@/core/math/geometry/Ellipse";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Polygon } from "@/core/math/geometry/Polygon";

interface LineParameters {
	A: number;
	B: number;
	C: number;
}

export class Line implements Shape {
	private readonly start: Vector2D;
	private readonly end: Vector2D;

	constructor(startX: number, startY: number, endX: number, endY: number) {
		this.start = new Vector2D(startX, startY);
		this.end = new Vector2D(endX, endY);
	}

	public static ofPoints(start: Vector2D, end: Vector2D): Line {
		return new Line(start.x, start.y, end.x, end.y);
	}

	public contains(point: Vector2D, tolerance: number = 0.001): boolean {
		const distanceStart = point.distanceBetween(this.start);
		const distanceEnd = point.distanceBetween(this.end);
		const length = this.getLength();

		return distanceStart + distanceEnd >= length - tolerance && distanceStart + distanceEnd <= length + tolerance;
	}

	public intersects(other: Shape): boolean {
		if (other instanceof Line) {
			return this.intersectsWithLine(other);
		} else if (other instanceof Circle) {
			return other.intersects(this);
		} else if (other instanceof Ellipse) {
			return other.intersects(this);
		} else if (other instanceof Rectangle) {
			return other.intersects(this);
		} else if (other instanceof Polygon) {
			return other.intersects(this);
		}

		return false;
	}

	private intersectsWithLine(other: Line): boolean {
		const self = this.getLineParameters();
		const line = other.getLineParameters();

		const denominator = self.A * line.B - line.A * self.B;
		if (denominator === 0) return false;

		const intersection = this.getIntersection(other);

		return this.contains(intersection) && other.contains(intersection);
	}

	public reflect(point: Vector2D): Vector2D {
		const self = this.getLineParameters();
		const bisector = this.getVerticalBisector(point);

		const denominator = self.A * bisector.B - bisector.A * self.B;

		const x = (bisector.B * self.C - self.B * bisector.C) / denominator;
		const y = (self.A * bisector.C - bisector.A * self.C) / denominator;

		// Reflection across the line is the point mirrored through the foot of
		// the perpendicular: R = 2 * I - P
		const intersection = new Vector2D(x, y);

		return intersection.multiply(2).subtract(point);
	}

	public isParallel(other: Line): boolean {
		const self = this.getLineParameters();
		const line = other.getLineParameters();

		const denominator = self.A * line.B - line.A * self.B;

		return denominator === 0;
	}

	public getIntersection(other: Line): Vector2D {
		const self = this.getLineParameters();
		const line = other.getLineParameters();

		const denominator = self.A * line.B - line.A * self.B;

		const x = (line.B * self.C - self.B * line.C) / denominator;
		const y = (self.A * line.C - line.A * self.C) / denominator;

		return new Vector2D(x, y);
	}

	public getVerticalBisector(point?: Vector2D): LineParameters {
		const self = this.getLineParameters();
		const other = point || this.getCenter();

		const A = -self.B;
		const B = self.A;
		const C = A * other.x + B * other.y;

		return { A, B, C };
	}

	public getLineParameters(): LineParameters {
		const A = this.end.y - this.start.y;
		const B = this.start.x - this.end.x;
		const C = A * this.start.x + B * this.start.y;

		return { A, B, C };
	}

	public getBounds(): Rectangle {
		const minX = Math.min(this.start.x, this.end.x);
		const minY = Math.min(this.start.y, this.end.y);
		const maxX = Math.max(this.start.x, this.end.x);
		const maxY = Math.max(this.start.y, this.end.y);

		return new Rectangle(minX, minY, maxX - minX, maxY - minY);
	}

	public getAngle(): number {
		const slope = this.getSlope();
		return Angle.toDegrees(Math.atan(slope));
	}

	public getSlope(): number {
		const delta = this.start.subtract(this.end);
		return delta.y / delta.x;
	}

	public getLength(): number {
		return this.start.distanceBetween(this.end);
	}

	public getCenter(): Vector2D {
		return this.start.add(this.end).divide(2);
	}

	public getStart(): Vector2D {
		return this.start;
	}

	public getEnd(): Vector2D {
		return this.end;
	}
}
