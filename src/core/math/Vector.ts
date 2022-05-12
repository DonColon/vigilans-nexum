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

	public static fromArray(values: VectorLike): Vector
	{
		return new Vector(values[0], values[1], values[2]);
	}

	public static fromAngle(angle: number): Vector
	{
		const radian = angle * Math.PI / 180;
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

	public flipX(): Vector
	{
		return new Vector(this.x * -1, this.y, this.z);
	}

	public flipY(): Vector
	{
		return new Vector(this.x, this.y * -1, this.z);
	}

	public flipZ(): Vector
	{
		return new Vector(this.x, this.y, this.z * -1);
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

	public rotate(angle: number): Vector
	{
		const radian = angle * Math.PI / 180;

		const newX = this.x * Math.cos(radian) - this.y * Math.sin(radian);
		const newY = this.x * Math.sin(radian) + this.y * Math.cos(radian);

		return new Vector(newX, newY, this.z);
	}

	public angleBetween(other: Vector): number 
	{
		const numerator = this.dot(other);
		const denominator = this.magnitude() * other.magnitude();
		return Math.acos(numerator / denominator) * 180 / Math.PI;
	}

	public heading(): number
	{
		return (Math.atan2(this.y, this.x) * 180 / Math.PI + 360) % 360;
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

	public lerp(other: Vector, amount: number): Vector 
	{
		if (amount > 1.0) amount = 1.0;

		const newX = this.x + (other.x - this.x) * amount;
		const newY = this.y + (other.y - this.y) * amount;
		const newZ = this.z + (other.z - this.z) * amount;

		return new Vector(newX, newY, newZ);
	}

	public equals(other: Vector): boolean 
	{
		return this.x === other.x
			&& this.y === other.y
			&& this.z === other.z;
	}
	
	public toArray(): VectorLike
	{
		return [this.x, this.y, this.z];
	}
}