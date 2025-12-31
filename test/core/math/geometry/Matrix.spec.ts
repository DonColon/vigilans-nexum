import { test, expect } from "vitest";
import { Matrix2D } from "@/core/math/geometry/Matrix2D";
import { Vector2D } from "@/core/math/geometry/Vector2D";

test("Create matrix from array", () => {
	const array = [
		[1, 2, 3],
		[4, 5, 6],
		[7, 8, 9]
	];

	const matrix = new Matrix2D(array);
	const result = matrix.asArray();

	expect(result).toEqual(array);
});

test("Create matrix from row vector", () => {
	const vector = new Vector2D(1, 2, 3);
	const matrix = Matrix2D.ofRowVector(vector);
	const result = matrix.asRowVector();

	expect(result.x).toBe(1);
	expect(result.y).toBe(2);
	expect(result.z).toBe(3);
});

test("Create matrix from row vectors", () => {
	const matrix = Matrix2D.ofRowVectors(new Vector2D(1, 2, 3), new Vector2D(4, 5, 6), new Vector2D(7, 8, 9));

	let result = matrix.asRowVector(0);

	expect(result.x).toBe(1);
	expect(result.y).toBe(2);
	expect(result.z).toBe(3);

	result = matrix.asRowVector(1);

	expect(result.x).toBe(4);
	expect(result.y).toBe(5);
	expect(result.z).toBe(6);

	result = matrix.asRowVector(2);

	expect(result.x).toBe(7);
	expect(result.y).toBe(8);
	expect(result.z).toBe(9);
});

test("Create matrix from column vector", () => {
	const vector = new Vector2D(1, 2, 3);
	const matrix = Matrix2D.ofColumnVector(vector);
	const result = matrix.asColumnVector();

	expect(result.x).toBe(1);
	expect(result.y).toBe(2);
	expect(result.z).toBe(3);
});

test("Create matrix from column vectors", () => {
	const matrix = Matrix2D.ofColumnVectors(new Vector2D(1, 2, 3), new Vector2D(4, 5, 6), new Vector2D(7, 8, 9));

	let result = matrix.asColumnVector(0);

	expect(result.x).toBe(1);
	expect(result.y).toBe(2);
	expect(result.z).toBe(3);

	result = matrix.asColumnVector(1);

	expect(result.x).toBe(4);
	expect(result.y).toBe(5);
	expect(result.z).toBe(6);

	result = matrix.asColumnVector(2);

	expect(result.x).toBe(7);
	expect(result.y).toBe(8);
	expect(result.z).toBe(9);
});

test("Create identity matrix", () => {
	const expected = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	];

	const matrix = Matrix2D.identity();
	const result = matrix.asArray();

	expect(result).toEqual(expected);
});

test("Translate vector with matrix", () => {
	const vector = new Vector2D(240, 651, 1);
	const result = Matrix2D.translate(vector, -10, 20);

	expect(result.x).toBe(230);
	expect(result.y).toBe(671);
	expect(result.z).toBe(1);
});

test("Scale vector with matrix", () => {
	const vector = new Vector2D(100, 100, 1);
	const result = Matrix2D.scale(vector, 1.4, 0.8);

	expect(result.x).toBe(140);
	expect(result.y).toBe(80);
	expect(result.z).toBe(1);
});

test("Rotate vector with matrix", () => {
	const vector = new Vector2D(1, -2, 4);
	let result = Matrix2D.rotate(vector, 45);

	expect(result.x).approximately(2.1213, 0.1);
	expect(result.y).approximately(-0.7071, 0.1);
	expect(result.z).toBe(4);

	result = Matrix2D.rotate(vector, 45, true);

	expect(result.x).approximately(-0.7071, 0.1);
	expect(result.y).approximately(-2.1213, 0.1);
	expect(result.z).toBe(4);
});

test("Shear vector with matrix on all axises", () => {
	const vector = new Vector2D(1, -2, 4);
	const result = Matrix2D.shear(vector, 45);

	// shear matrix: [[1, tan(45°), 0], [tan(45°), 1, 0], [0, 0, 1]]
	// tan(45°) = 1
	// x = 1 * 1 + (-2) * 1 + 0 * 4 = 1 - 2 = -1
	// y = 1 * 1 + (-2) * 1 + 0 * 4 = 1 - 2 = -1
	expect(result.x).approximately(-1, 0.0001);
	expect(result.y).approximately(-1, 0.0001);
	expect(result.z).toBe(4);
});

test("Shear vector with matrix on x-axis", () => {
	const vector = new Vector2D(1, -2, 4);
	const result = Matrix2D.shearX(vector, 45);

	// shearX matrix: [[1, tan(45°), 0], [0, 1, 0], [0, 0, 1]]
	// x = 1 * 1 + (-2) * 1 + 0 * 4 = 1 - 2 = -1
	expect(result.x).approximately(-1, 0.0001);
	expect(result.y).toBe(-2);
	expect(result.z).toBe(4);
});

test("Shear vector with matrix on y-axis", () => {
	const vector = new Vector2D(1, -2, 4);
	const result = Matrix2D.shearY(vector, 45);

	// shearY matrix: [[1, 0, 0], [tan(45°), 1, 0], [0, 0, 1]]
	// y = 1 * 1 + (-2) * 1 + 0 * 4 = 1 - 2 = -1
	expect(result.x).toBe(1);
	expect(result.y).toBe(-1);
	expect(result.z).toBe(4);
});

test("Reflect vector with matrix on all axises", () => {
	const vector = new Vector2D(1, -2, 4);
	const result = Matrix2D.reflect(vector);

	expect(result.x).toBe(-1);
	expect(result.y).toBe(2);
	expect(result.z).toBe(-4);
});

test("Reflect vector with matrix on x-axis", () => {
	const vector = new Vector2D(1, -2, 4);
	const result = Matrix2D.reflectX(vector);

	expect(result.x).toBe(-1);
	expect(result.y).toBe(-2);
	expect(result.z).toBe(4);
});

test("Reflect vector with matrix on y-axis", () => {
	const vector = new Vector2D(1, -2, 4);
	const result = Matrix2D.reflectY(vector);

	expect(result.x).toBe(1);
	expect(result.y).toBe(2);
	expect(result.z).toBe(4);
});

test("Reflect vector with matrix on z-axis", () => {
	const vector = new Vector2D(1, -2, 4);
	const result = Matrix2D.reflectZ(vector);

	expect(result.x).toBe(1);
	expect(result.y).toBe(-2);
	expect(result.z).toBe(-4);
});

test("Add two matrices", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const other = new Matrix2D([
		[5, 7, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.add(other);

	expect(result.asArray()).toEqual([
		[7, 10, 8],
		[6, 8, 2],
		[14, 16, 4]
	]);
});

test("Add two rows of matrix", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.addRow(0, 1);

	expect(result.asArray()).toEqual([
		[2, 3, 4],
		[5, 7, 5],
		[7, 8, 2]
	]);
});

test("Add two columns of matrix", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.addColumn(0, 1);

	expect(result.asArray()).toEqual([
		[2, 5, 4],
		[3, 7, 1],
		[7, 15, 2]
	]);
});

test("Subtract two matrices", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const other = new Matrix2D([
		[5, 7, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.subtract(other);

	expect(result.asArray()).toEqual([
		[-3, -4, 0],
		[0, 0, 0],
		[0, 0, 0]
	]);
});

test("Subtract two rows of matrix", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.subtractRow(0, 1);

	expect(result.asArray()).toEqual([
		[2, 3, 4],
		[1, 1, -3],
		[7, 8, 2]
	]);
});

test("Subtract two columns of matrix", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.subtractColumn(0, 1);

	expect(result.asArray()).toEqual([
		[2, 1, 4],
		[3, 1, 1],
		[7, 1, 2]
	]);
});

test("Multiply matrix with scalar", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.multiply(10);

	expect(result.asArray()).toEqual([
		[20, 30, 40],
		[30, 40, 10],
		[70, 80, 20]
	]);
});

test("Multiply row with scalar", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.multiplyRow(10, 0);

	expect(result.asArray()).toEqual([
		[20, 30, 40],
		[3, 4, 1],
		[7, 8, 2]
	]);
});

test("Multiply column with scalar", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.multiplyColumn(10, 0);

	expect(result.asArray()).toEqual([
		[20, 3, 4],
		[30, 4, 1],
		[70, 8, 2]
	]);
});

test("Divide matrix with scalar", () => {
	const value = new Matrix2D([
		[20, 30, 40],
		[30, 40, 10],
		[70, 80, 20]
	]);

	const result = value.divide(10);

	expect(result.asArray()).toEqual([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);
});

test("Divide row with scalar", () => {
	const value = new Matrix2D([
		[20, 30, 40],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.divideRow(10, 0);

	expect(result.asArray()).toEqual([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);
});

test("Divide column with scalar", () => {
	const value = new Matrix2D([
		[20, 3, 4],
		[30, 4, 1],
		[70, 8, 2]
	]);

	const result = value.divideColumn(10, 0);

	expect(result.asArray()).toEqual([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);
});

test("Switch row with scalar", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.switchRows(0, 1);

	expect(result.asArray()).toEqual([
		[3, 4, 1],
		[2, 3, 4],
		[7, 8, 2]
	]);
});

test("Switch column with scalar", () => {
	const value = new Matrix2D([
		[2, 3, 4],
		[3, 4, 1],
		[7, 8, 2]
	]);

	const result = value.switchColumns(0, 1);

	expect(result.asArray()).toEqual([
		[3, 2, 4],
		[4, 3, 1],
		[8, 7, 2]
	]);
});

test("Product of two matrices", () => {
	const value = new Matrix2D([
		[1, 2, -1],
		[3, 2, 0],
		[-4, 0, 2]
	]);

	const other = new Matrix2D([
		[3, 4, 2],
		[0, 1, 0],
		[-2, 0, 1]
	]);

	const result = value.product(other);

	expect(result.asArray()).toEqual([
		[5, 6, 1],
		[9, 14, 6],
		[-16, -16, -6]
	]);
});

test("Transpose matrix", () => {
	const value = new Matrix2D([
		[1, 2, -1],
		[3, 2, 0],
		[-4, 0, 2]
	]);

	const result = value.transpose();

	expect(result.asArray()).toEqual([
		[1, 3, -4],
		[2, 2, 0],
		[-1, 0, 2]
	]);
});

test("Determinant of matrix", () => {
	const matrix = new Matrix2D([
		[4, -1, -2],
		[-3, 3, 2],
		[-1, -4, 2]
	]);

	let result = matrix.determinant();
	expect(result).toBe(22);

	result = Matrix2D.determinant([[1]]);
	expect(result).toBe(1);
});

test("Trace of matrix", () => {
	const value = new Matrix2D([
		[1, 2, -1],
		[3, 2, 0],
		[-4, 0, 2]
	]);

	const result = value.trace();
	expect(result).toBe(5);
});

test("Inverse of matrix", () => {
	const value = new Matrix2D([
		[1, 2, -1],
		[2, 1, 2],
		[-1, 2, 1]
	]);

	const result = value.inverse();
	const other = value.product(result);

	expect(other.asArray()).toEqual([
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	]);
});

test("Adjoint of matrix", () => {
	const value = new Matrix2D([
		[1, 2, -1],
		[2, 1, 2],
		[-1, 2, 1]
	]);

	const result = value.adjoint();

	expect(result.asArray()).toEqual([
		[-3, -4, 5],
		[-4, 0, -4],
		[5, -4, -3]
	]);
});

test("Cofactor of matrix", () => {
	const value = new Matrix2D([
		[1, 2, -1],
		[2, 1, 2],
		[-1, 2, 1]
	]);

	const result = value.cofactor();

	expect(result.asArray()).toEqual([
		[-3, -4, 5],
		[-4, 0, -4],
		[5, -4, -3]
	]);
});

test("Two matrices are equal", () => {
	const value = new Matrix2D([
		[1, 2, -1],
		[2, 1, 2],
		[-1, 2, 1]
	]);

	const equalMatrix = new Matrix2D([
		[1, 2, -1],
		[2, 1, 2],
		[-1, 2, 1]
	]);

	const notEqualMatrix = new Matrix2D([
		[1, 2, 0],
		[2, 1, 2],
		[0, 2, 1]
	]);

	let result = value.equals(equalMatrix);
	expect(result).toBeTruthy();

	result = value.equals(notEqualMatrix);
	expect(result).toBeFalsy();
});
