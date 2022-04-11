export class Vector 
{
	private x: number;
	private y: number;
	private z: number;


	constructor(x: number, y: number, z: number = 0) 
	{
		this.x = x;
		this.y = y;
		this.z = z;
	}


	public add(other: Vector): Vector 
	{
		return new Vector(this.x + other.x, this.y + other.y, this.z + other.z);
	}

	public subtract(other: Vector): Vector 
	{
		return new Vector(this.x - other.x, this.y - other.y, this.z - other.z);
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
		const vector = other.subtract(this);
		return vector.magnitude();
	}

	public angleBetween(other: Vector): number 
	{
		const numerator = this.dot(other);
		const denominator = this.magnitude() * other.magnitude();
		return Math.acos(numerator / denominator) * 180 / Math.PI;
	}

	public isCollinear(other: Vector): boolean 
	{
		const checkX = this.x / other.x;
		const checkY = this.y / other.y;
		const checkZ = this.z / other.z;

		if (checkX === checkY || checkY === checkZ || checkZ === checkX)
			return true;
		else
			return false;
	}

	public isVertical(other: Vector): boolean 
	{
		if (this.dot(other) === 0)
			return true;
		else
			return false;
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

	public getX(): number 
	{
		return this.x;
	}

	public getY(): number 
	{
		return this.y;
	}

	public getZ(): number 
	{
		return this.z;
	}
}