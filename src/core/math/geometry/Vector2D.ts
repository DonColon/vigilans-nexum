import { Angle } from "@/core/math/geometry/Angle";
import { Tuple } from "@/core/utils/Arrays";

export class Vector2D {
	public x: number;
	public y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	public static ofArray(values: Tuple<number, 2>): Vector2D {
		return new Vector2D(values[0], values[1]);
	}

	public static ofAngle(angle: number): Vector2D {
		const radian = Angle.toRadians(angle);
		return new Vector2D(Math.cos(radian), Math.sin(radian));
	}

	public add(other: Vector2D): Vector2D {
		return new Vector2D(this.x + other.x, this.y + other.y);
	}

	public subtract(other: Vector2D): Vector2D {
		return new Vector2D(this.x - other.x, this.y - other.y);
	}

	public multiply(scalar: number): Vector2D {
		return new Vector2D(this.x * scalar, this.y * scalar);
	}

	public divide(scalar: number): Vector2D {
		return new Vector2D(this.x / scalar, this.y / scalar);
	}

	public dot(other: Vector2D): number {
		return this.x * other.x + this.y * other.y;
	}

	public cross(other: Vector2D): number {
		return this.x * other.y - this.y * other.x;
	}

	/**
	 * Perpendicular dot product (also known as the 2D wedge or cross product).
	 * Equals the z-component of the 3D cross product and is positive when
	 * `other` lies counter-clockwise from this vector.
	 */
	public perpDot(other: Vector2D): number {
		return this.cross(other);
	}

	public magnitude(): number {
		return Math.sqrt(this.magnitudeSquared());
	}

	public magnitudeSquared(): number {
		return this.x * this.x + this.y * this.y;
	}

	public normalize(): Vector2D {
		const magnitude = this.magnitude();
		return magnitude === 0 ? new Vector2D(0, 0) : this.divide(magnitude);
	}

	public distanceBetween(other: Vector2D): number {
		return this.subtract(other).magnitude();
	}

	public angleBetween(other: Vector2D): number {
		const numerator = this.dot(other);
		const denominator = this.magnitude() * other.magnitude();

		if (denominator === 0) {
			return 0;
		}

		const cosTheta = Math.max(-1, Math.min(1, numerator / denominator));
		return Angle.toDegrees(Math.acos(cosTheta));
	}

	public heading(): number {
		return Angle.toDegrees(Math.atan2(this.y, this.x));
	}

	public interpolate(other: Vector2D, scale: number): Vector2D {
		if (scale > 1.0) scale = 1.0;
		if (scale < 0.0) scale = 0.0;

		const direction = other.subtract(this).multiply(scale);
		return this.add(direction);
	}

	public isCollinear(other: Vector2D): boolean {
		return this.cross(other) === 0;
	}

	public isOrthogonal(other: Vector2D): boolean {
		return this.dot(other) === 0;
	}

	public equals(other: Vector2D): boolean {
		return this.x === other.x && this.y === other.y;
	}

	public asArray(): Tuple<number, 2> {
		return [this.x, this.y];
	}
}
