import { toDegrees, toRadians } from "core/utils/Maths";


export type VectorLike = [number, number, number?];


export class Vector 
{
	public x: number;
	public y: number;
	public z: number;


	constructor(x: number, y: number, z: number = 0) 
	{
		this.x = x;
		this.y = y;
		this.z = z;
	}

	public static ofArray(values: VectorLike): Vector
	{
		return new Vector(values[0], values[1], values[2]);
	}

	public static ofAngle(angle: number): Vector
	{
		const radian = toRadians(angle);
		return new Vector(Math.cos(radian), Math.sin(radian));
	}

	
	public add(other: Vector): Vector 
	{
		return new Vector(this.x + other.x, this.y + other.y, this.z + other.z);
	}

	public subtract(other: Vector): Vector 
	{
		return new Vector(other.x - this.x, other.y - this.y, other.z - this.z);
	}

	public multiply(scalar: number): Vector 
	{
		return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
	}

	public divide(scalar: number): Vector 
	{
		return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
	}


	public dot(other: Vector): number 
	{
		return this.x * other.x + this.y * other.y + this.z * other.z;
	}

	public perpDot(other: Vector): number
	{
		return this.x * other.y - this.y * other.x;
	}

	public cross(other: Vector): Vector 
	{
		return new Vector(this.y * other.z - this.z * other.y,
						  this.z * other.x - this.x * other.z,
						  this.x * other.y - this.y * other.x);
	}


	public magnitude(): number 
	{
		return Math.sqrt(this.magnitudeSquared());
	}

	public magnitudeSquared(): number 
	{
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

	public normalize(): Vector 
	{
		const magnitude = this.magnitude();
		return this.divide(magnitude);
	}

	public distanceBetween(other: Vector): number 
	{
		const vector = this.subtract(other);
		return vector.magnitude();
	}

	public angleBetween(other: Vector): number 
	{
		const numerator = this.dot(other);
		const denominator = this.magnitude() * other.magnitude();
		return toDegrees(Math.acos(numerator / denominator));
	}

	public heading(): number
	{
		const angle = toDegrees(Math.atan2(this.y, this.x))
		return (angle + 360) % 360;
	}

	public interpolate(other: Vector, scale: number): Vector 
	{
		if (scale > 1.0) scale = 1.0;

		const direction = this.subtract(other).multiply(scale);
		return this.add(direction);
	}


	public isCollinear(other: Vector): boolean 
	{
		const checkX = this.x / other.x;
		const checkY = this.y / other.y;
		const checkZ = this.z / other.z;

		return checkX === checkY || checkY === checkZ || checkZ === checkX;
	}

	public isVertical(other: Vector): boolean 
	{
		return this.dot(other) === 0;
	}

	public equals(other: Vector): boolean 
	{
		return this.x === other.x
			&& this.y === other.y
			&& this.z === other.z;
	}
	
	public asArray(): VectorLike
	{
		return [this.x, this.y, this.z];
	}
}