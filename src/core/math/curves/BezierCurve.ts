import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Line } from "@/core/math/geometry/Line";

/**
 * Represents a Bezier curve with support for quadratic and cubic curves.
 * Bezier curves are parametric curves commonly used for smooth paths,
 * animations, and UI transitions in games.
 */
export class BezierCurve {
	private readonly controlPoints: Vector2D[];
	private readonly degree: number;
	private cachedLength?: number;
	private cachedLookupTable?: Vector2D[];

	constructor(controlPoints: Vector2D[]) {
		if (controlPoints.length < 2) {
			throw new Error("BezierCurve requires at least 2 control points");
		}
		if (controlPoints.length > 4) {
			throw new Error("BezierCurve supports up to 4 control points (cubic)");
		}

		this.controlPoints = [...controlPoints];
		this.degree = controlPoints.length - 1;
	}

	/**
	 * Creates a quadratic Bezier curve (3 control points)
	 */
	public static quadratic(start: Vector2D, control: Vector2D, end: Vector2D): BezierCurve {
		return new BezierCurve([start, control, end]);
	}

	/**
	 * Creates a cubic Bezier curve (4 control points)
	 */
	public static cubic(start: Vector2D, control1: Vector2D, control2: Vector2D, end: Vector2D): BezierCurve {
		return new BezierCurve([start, control1, control2, end]);
	}

	/**
	 * Creates a linear Bezier curve (straight line between 2 points)
	 */
	public static linear(start: Vector2D, end: Vector2D): BezierCurve {
		return new BezierCurve([start, end]);
	}

	/**
	 * Evaluates the curve at parameter t (0 to 1)
	 * @param t - Parameter value between 0 and 1
	 * @returns Point on the curve at t
	 */
	public getPoint(t: number): Vector2D {
		t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

		if (this.degree === 1) {
			return this.evaluateLinear(t);
		} else if (this.degree === 2) {
			return this.evaluateQuadratic(t);
		} else if (this.degree === 3) {
			return this.evaluateCubic(t);
		}

		// Fallback to De Casteljau's algorithm for any degree
		return this.deCasteljau(this.controlPoints, t);
	}

	/**
	 * Gets the tangent (direction) vector at parameter t
	 */
	public getTangent(t: number): Vector2D {
		t = Math.max(0, Math.min(1, t));
		const epsilon = 0.0001;

		const p1 = this.getPoint(Math.max(0, t - epsilon));
		const p2 = this.getPoint(Math.min(1, t + epsilon));

		return p2.subtract(p1).normalize();
	}

	/**
	 * Gets the normal (perpendicular) vector at parameter t
	 */
	public getNormal(t: number): Vector2D {
		const tangent = this.getTangent(t);
		return new Vector2D(-tangent.y, tangent.x); // 2D perpendicular
	}

	/**
	 * Gets the derivative (velocity) at parameter t
	 */
	public getDerivative(t: number): Vector2D {
		t = Math.max(0, Math.min(1, t));

		if (this.degree === 1) {
			const [p0, p1] = this.controlPoints;
			return p1.subtract(p0);
		} else if (this.degree === 2) {
			const [p0, p1, p2] = this.controlPoints;
			const a = p1.subtract(p0).multiply(2 * (1 - t));
			const b = p2.subtract(p1).multiply(2 * t);
			return a.add(b);
		} else if (this.degree === 3) {
			const [p0, p1, p2, p3] = this.controlPoints;
			const tt = t * t;
			const oneMinusT = 1 - t;
			const oneMinusTSquared = oneMinusT * oneMinusT;

			const a = p1.subtract(p0).multiply(3 * oneMinusTSquared);
			const b = p2.subtract(p1).multiply(6 * oneMinusT * t);
			const c = p3.subtract(p2).multiply(3 * tt);

			return a.add(b).add(c);
		}

		// Fallback
		const epsilon = 0.0001;
		const p1 = this.getPoint(t);
		const p2 = this.getPoint(Math.min(1, t + epsilon));
		return p2.subtract(p1).divide(epsilon);
	}

	/**
	 * Approximates the length of the curve
	 * Uses adaptive sampling for accuracy
	 */
	public getLength(segments: number = 100): number {
		if (this.cachedLength !== undefined) {
			return this.cachedLength;
		}

		let length = 0;
		let previousPoint = this.getPoint(0);

		for (let i = 1; i <= segments; i++) {
			const t = i / segments;
			const currentPoint = this.getPoint(t);
			length += previousPoint.distanceBetween(currentPoint);
			previousPoint = currentPoint;
		}

		this.cachedLength = length;
		return length;
	}

	/**
	 * Gets a point at a specific distance along the curve
	 * @param distance - Distance from start of curve
	 * @returns Point at that distance, or null if distance exceeds curve length
	 */
	public getPointAtDistance(distance: number): Vector2D | null {
		const totalLength = this.getLength();
		if (distance < 0 || distance > totalLength) {
			return null;
		}

		const t = this.distanceToT(distance);
		return this.getPoint(t);
	}

	/**
	 * Splits the curve at parameter t into two curves
	 */
	public split(t: number): { left: BezierCurve; right: BezierCurve } {
		t = Math.max(0, Math.min(1, t));

		if (this.degree === 1) {
			const p = this.getPoint(t);
			return {
				left: new BezierCurve([this.controlPoints[0], p]),
				right: new BezierCurve([p, this.controlPoints[1]])
			};
		}

		const leftPoints: Vector2D[] = [];
		const rightPoints: Vector2D[] = [];

		let points = [...this.controlPoints];
		leftPoints.push(points[0]);

		for (let i = 0; i < this.degree; i++) {
			const newPoints: Vector2D[] = [];
			for (let j = 0; j < points.length - 1; j++) {
				newPoints.push(points[j].interpolate(points[j + 1], t));
			}
			points = newPoints;
			leftPoints.push(points[0]);
		}

		points = [...this.controlPoints];
		rightPoints.unshift(points[points.length - 1]);

		for (let i = 0; i < this.degree; i++) {
			const newPoints: Vector2D[] = [];
			for (let j = 0; j < points.length - 1; j++) {
				newPoints.push(points[j].interpolate(points[j + 1], t));
			}
			points = newPoints;
			rightPoints.unshift(points[points.length - 1]);
		}

		return {
			left: new BezierCurve(leftPoints),
			right: new BezierCurve(rightPoints)
		};
	}

	/**
	 * Gets evenly spaced points along the curve
	 */
	public getPoints(count: number): Vector2D[] {
		const points: Vector2D[] = [];
		for (let i = 0; i <= count; i++) {
			const t = i / count;
			points.push(this.getPoint(t));
		}
		return points;
	}

	/**
	 * Gets the bounding box of the curve
	 */
	public getBounds(): Rectangle {
		// Sample the curve to find min/max bounds
		const samples = 50;
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (let i = 0; i <= samples; i++) {
			const t = i / samples;
			const point = this.getPoint(t);

			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}

		return new Rectangle(minX, minY, maxX - minX, maxY - minY);
	}

	/**
	 * Finds the closest point on the curve to a given point
	 */
	public getClosestPoint(point: Vector2D, samples: number = 100): { point: Vector2D; t: number; distance: number } {
		let closestPoint = this.getPoint(0);
		let closestT = 0;
		let closestDistance = point.distanceBetween(closestPoint);

		for (let i = 1; i <= samples; i++) {
			const t = i / samples;
			const curvePoint = this.getPoint(t);
			const distance = point.distanceBetween(curvePoint);

			if (distance < closestDistance) {
				closestDistance = distance;
				closestPoint = curvePoint;
				closestT = t;
			}
		}

		return { point: closestPoint, t: closestT, distance: closestDistance };
	}

	/**
	 * Checks if a point is near the curve within a tolerance
	 */
	public containsPoint(point: Vector2D, tolerance: number = 1): boolean {
		const closest = this.getClosestPoint(point);
		return closest.distance <= tolerance;
	}

	/**
	 * Gets all control points
	 */
	public getControlPoints(): Vector2D[] {
		return [...this.controlPoints];
	}

	/**
	 * Gets the start point of the curve
	 */
	public getStart(): Vector2D {
		return this.controlPoints[0];
	}

	/**
	 * Gets the end point of the curve
	 */
	public getEnd(): Vector2D {
		return this.controlPoints[this.controlPoints.length - 1];
	}

	/**
	 * Gets the degree of the curve (1=linear, 2=quadratic, 3=cubic)
	 */
	public getDegree(): number {
		return this.degree;
	}

	/**
	 * Converts a curve to a series of line segments
	 */
	public toLineSegments(segments: number = 20): Line[] {
		const lines: Line[] = [];
		let previousPoint = this.getPoint(0);

		for (let i = 1; i <= segments; i++) {
			const t = i / segments;
			const currentPoint = this.getPoint(t);
			lines.push(Line.ofPoints(previousPoint, currentPoint));
			previousPoint = currentPoint;
		}

		return lines;
	}

	// Private helper methods

	private evaluateLinear(t: number): Vector2D {
		const [p0, p1] = this.controlPoints;
		return p0.interpolate(p1, t);
	}

	private evaluateQuadratic(t: number): Vector2D {
		const [p0, p1, p2] = this.controlPoints;
		const oneMinusT = 1 - t;
		const oneMinusTSquared = oneMinusT * oneMinusT;
		const tSquared = t * t;

		const x = oneMinusTSquared * p0.x + 2 * oneMinusT * t * p1.x + tSquared * p2.x;
		const y = oneMinusTSquared * p0.y + 2 * oneMinusT * t * p1.y + tSquared * p2.y;

		return new Vector2D(x, y);
	}

	private evaluateCubic(t: number): Vector2D {
		const [p0, p1, p2, p3] = this.controlPoints;
		const oneMinusT = 1 - t;
		const oneMinusTCubed = oneMinusT * oneMinusT * oneMinusT;
		const oneMinusTSquared = oneMinusT * oneMinusT;
		const tSquared = t * t;
		const tCubed = tSquared * t;

		const x = oneMinusTCubed * p0.x + 3 * oneMinusTSquared * t * p1.x + 3 * oneMinusT * tSquared * p2.x + tCubed * p3.x;
		const y = oneMinusTCubed * p0.y + 3 * oneMinusTSquared * t * p1.y + 3 * oneMinusT * tSquared * p2.y + tCubed * p3.y;

		return new Vector2D(x, y);
	}

	private deCasteljau(points: Vector2D[], t: number): Vector2D {
		if (points.length === 1) {
			return points[0];
		}

		const newPoints: Vector2D[] = [];
		for (let i = 0; i < points.length - 1; i++) {
			newPoints.push(points[i].interpolate(points[i + 1], t));
		}

		return this.deCasteljau(newPoints, t);
	}

	private distanceToT(targetDistance: number, segments: number = 100): number {
		let accumulatedDistance = 0;
		let previousPoint = this.getPoint(0);

		for (let i = 1; i <= segments; i++) {
			const t = i / segments;
			const currentPoint = this.getPoint(t);
			const segmentLength = previousPoint.distanceBetween(currentPoint);

			if (accumulatedDistance + segmentLength >= targetDistance) {
				const remaining = targetDistance - accumulatedDistance;
				const ratio = remaining / segmentLength;
				return (i - 1 + ratio) / segments;
			}

			accumulatedDistance += segmentLength;
			previousPoint = currentPoint;
		}

		return 1;
	}

	private buildLookupTable(samples: number = 100): void {
		if (this.cachedLookupTable) return;

		this.cachedLookupTable = [];
		for (let i = 0; i <= samples; i++) {
			const t = i / samples;
			this.cachedLookupTable.push(this.getPoint(t));
		}
	}
}
