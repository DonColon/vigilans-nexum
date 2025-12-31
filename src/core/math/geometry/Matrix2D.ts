import { fillMatrix, Matrix as MatrixLike } from "@/core/utils/Arrays";
import { Angle } from "@/core/math/geometry/Angle";
import { Vector2D } from "@/core/math/geometry/Vector2D";

export class Matrix2D {
	private readonly values: MatrixLike<number, 3, 3>;

	constructor(values: number[][]) {
		this.values = fillMatrix(0, 3, 3);

		for (let row = 0; row < this.values.length; row++) {
			for (let column = 0; column < this.values[row].length; column++) {
				if (values[row] === undefined) continue;

				if (values[row][column] === undefined) {
					if (row === column) this.values[row][column] = 1;
					continue;
				}	

				this.values[row][column] = values[row][column];
			}
		}
	}

	public static ofRowVector(vector: Vector2D): Matrix2D {
		return new Matrix2D([[vector.x, vector.y, 0]]);
	}

	public static ofColumnVector(vector: Vector2D): Matrix2D {
		return new Matrix2D([[vector.x], [vector.y], [0]]);
	}

	public static ofRowVectors(start: Vector2D, center: Vector2D, end: Vector2D): Matrix2D {
		return new Matrix2D([
			[start.x, start.y, 0],
			[center.x, center.y, 0],
			[end.x, end.y, 0]
		]);
	}

	public static ofColumnVectors(start: Vector2D, center: Vector2D, end: Vector2D): Matrix2D {
		return new Matrix2D([
			[start.x, center.x, end.x],
			[start.y, center.y, end.y],
			[0, 0, 1]
		]);
	}

	public static ofMatrixLike(values: MatrixLike<number, 3, 3>): Matrix2D {
		return new Matrix2D(values);
	}

	public static identity(): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let index = 0; index < values.length; index++) {
			values[index][index] = 1;
		}

		return new Matrix2D(values);
	}

	public static determinant(values: number[][]): number {
		if (values.length === 1) {
			return values[0][0];
		} else if (values.length === 2) {
			return values[0][0] * values[1][1] - values[0][1] * values[1][0];
		}

		return values[0].reduce((previous, current, i) => previous + (-1) ** (i + 2) * current * Matrix2D.determinant(values.slice(1).map((matrix) => matrix.filter((_, k) => i != k))), 0);
	}

	public static translate(vector: Vector2D, x: number, y: number): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);

		const transformation = new Matrix2D([
			[1, 0, x],
			[0, 1, y],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static scale(vector: Vector2D, width: number, height: number): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);

		const transformation = new Matrix2D([
			[width, 0, 0],
			[0, height, 0],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static rotate(vector: Vector2D, angle: number, clockwise: boolean = false): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);
		let radian = Angle.toRadians(angle);

		if (clockwise) radian *= -1;

		const transformation = new Matrix2D([
			[Math.cos(radian), -Math.sin(radian), 0],
			[Math.sin(radian), Math.cos(radian), 0],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static shear(vector: Vector2D, angle: number): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);
		const radian = Angle.toRadians(angle);

		const transformation = new Matrix2D([
			[1, Math.tan(radian), 0],
			[Math.tan(radian), 1, 0],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static shearX(vector: Vector2D, angle: number): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);
		const radian = Angle.toRadians(angle);

		const transformation = new Matrix2D([
			[1, Math.tan(radian), 0],
			[0, 1, 0],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static shearY(vector: Vector2D, angle: number): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);
		const radian = Angle.toRadians(angle);

		const transformation = new Matrix2D([
			[1, 0, 0],
			[Math.tan(radian), 1, 0],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static reflect(vector: Vector2D): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);

		const transformation = new Matrix2D([
			[-1, 0, 0],
			[0, -1, 0],
			[0, 0, -1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static reflectX(vector: Vector2D): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);

		const transformation = new Matrix2D([
			[-1, 0, 0],
			[0, 1, 0],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static reflectY(vector: Vector2D): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);

		const transformation = new Matrix2D([
			[1, 0, 0],
			[0, -1, 0],
			[0, 0, 1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public static reflectZ(vector: Vector2D): Vector2D {
		const other = Matrix2D.ofColumnVector(vector);

		const transformation = new Matrix2D([
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, -1]
		]);

		return transformation.product(other).asColumnVector();
	}

	public add(other: Matrix2D): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let row = 0; row < values.length; row++) {
			for (let column = 0; column < values[row].length; column++) {
				values[row][column] = this.values[row][column] + other.values[row][column];
			}
		}

		return new Matrix2D(values);
	}

	public addRow(from: number, to: number): Matrix2D {
		const values = this.asArray();

		for (let column = 0; column < values[to].length; column++) {
			values[to][column] += values[from][column];
		}

		return new Matrix2D(values);
	}

	public addColumn(from: number, to: number): Matrix2D {
		const values = this.asArray();

		for (const row of values) {
			row[to] += row[from];
		}

		return new Matrix2D(values);
	}

	public subtract(other: Matrix2D): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let row = 0; row < values.length; row++) {
			for (let column = 0; column < values[row].length; column++) {
				values[row][column] = this.values[row][column] - other.values[row][column];
			}
		}

		return new Matrix2D(values);
	}

	public subtractRow(from: number, to: number): Matrix2D {
		const values = this.asArray();

		for (let column = 0; column < values[to].length; column++) {
			values[to][column] -= values[from][column];
		}

		return new Matrix2D(values);
	}

	public subtractColumn(from: number, to: number): Matrix2D {
		const values = this.asArray();

		for (const row of values) {
			row[to] -= row[from];
		}

		return new Matrix2D(values);
	}

	public multiply(scalar: number): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let row = 0; row < values.length; row++) {
			for (let column = 0; column < values[row].length; column++) {
				values[row][column] = this.values[row][column] * scalar;
			}
		}

		return new Matrix2D(values);
	}

	public multiplyRow(scalar: number, to: number) {
		const values = this.asArray();

		for (let column = 0; column < values[to].length; column++) {
			values[to][column] *= scalar;
		}

		return new Matrix2D(values);
	}

	public multiplyColumn(scalar: number, to: number): Matrix2D {
		const values = this.asArray();

		for (const row of values) {
			row[to] *= scalar;
		}

		return new Matrix2D(values);
	}

	public divide(scalar: number): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let row = 0; row < values.length; row++) {
			for (let column = 0; column < values[row].length; column++) {
				values[row][column] = this.values[row][column] / scalar;
			}
		}

		return new Matrix2D(values);
	}

	public divideRow(scalar: number, to: number) {
		const values = this.asArray();

		for (let column = 0; column < values[to].length; column++) {
			values[to][column] /= scalar;
		}

		return new Matrix2D(values);
	}

	public divideColumn(scalar: number, to: number): Matrix2D {
		const values = this.asArray();

		for (const row of values) {
			row[to] /= scalar;
		}

		return new Matrix2D(values);
	}

	public switchRows(from: number, to: number): Matrix2D {
		const values = this.asArray();

		const temp = values[to];
		values[to] = values[from];
		values[from] = temp;

		return new Matrix2D(values);
	}

	public switchColumns(from: number, to: number): Matrix2D {
		const values = this.asArray();

		for (const row of values) {
			const temp = row[to];
			row[to] = row[from];
			row[from] = temp;
		}

		return new Matrix2D(values);
	}

	public product(other: Matrix2D): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let row = 0; row < this.values.length; row++) {
			for (let column = 0; column < other.values[0].length; column++) {
				for (let index = 0; index < this.values[row].length; index++) {
					values[row][column] += this.values[row][index] * other.values[index][column];
				}
			}
		}

		return new Matrix2D(values);
	}

	public transpose(): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let row = 0; row < values.length; row++) {
			for (let column = 0; column < values[row].length; column++) {
				values[column][row] = this.values[row][column];
			}
		}

		return new Matrix2D(values);
	}

	public determinant(): number {
		return Matrix2D.determinant(this.values);
	}

	public trace(): number {
		let trace = 0;

		for (let index = 0; index < this.values.length; index++) {
			trace += this.values[index][index];
		}

		return trace;
	}

	public inverse(): Matrix2D {
		return this.adjoint().divide(this.determinant());
	}

	public adjoint(): Matrix2D {
		return this.cofactor().transpose();
	}

	public cofactor(): Matrix2D {
		const values = fillMatrix(0, 3, 3);

		for (let row = 0; row < values.length; row++) {
			for (let column = 0; column < values[row].length; column++) {
				const subMatrix = this.values.filter((_, i) => i != row).map((row) => row.filter((_, k) => k != column));

				values[row][column] = (-1) ** (row + column) * Matrix2D.determinant(subMatrix);
			}
		}

		return new Matrix2D(values);
	}

	public equals(other: Matrix2D): boolean {
		return JSON.stringify(this.values) === JSON.stringify(other.values);
	}

	public asArray(): MatrixLike<number, 3, 3> {
		return [...this.values];
	}

	public getCell(row: number, column: number): number {
		return this.values[row][column];
	}

	public asRowVector(row: number = 0): Vector2D {
		return new Vector2D(this.values[row][0], this.values[row][1]);
	}

	public asColumnVector(column: number = 0): Vector2D {
		return new Vector2D(this.values[0][column], this.values[1][column]);
	}

	public asTranslation(): Vector2D {
		return new Vector2D(this.values[0][2], this.values[1][2]);
	}

	public asScale(): Vector2D {
		return new Vector2D(this.values[0][0], this.values[1][1]);
	}

	public asRotation(clockwise: boolean = false): number {
		let angle = Angle.toDegrees(Math.atan2(this.values[1][0], this.values[0][0]));

		if (clockwise) angle *= -1;

		return angle;
	}
}
