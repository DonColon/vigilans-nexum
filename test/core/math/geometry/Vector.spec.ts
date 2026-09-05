import { test, expect } from "vitest";
import { Vector2D } from "@/core/math/geometry/Vector2D";

test("Create vector from array", () => {
	const result = Vector2D.ofArray([2, 3]);

	expect(result.x).toBe(2);
	expect(result.y).toBe(3);
});

test("Create vector from angle", () => {
	const result = Vector2D.ofAngle(45);

	expect(result.x).approximately(0.7071067811865476, 0.0000000000000005);
	expect(result.y).approximately(0.7071067811865475, 0.0000000000000005);
});

test("Addition of vectors", () => {
	const value = new Vector2D(3, 5);
	const other = new Vector2D(2, 5);
	const result = value.add(other);

	expect(result.x).toBe(5);
	expect(result.y).toBe(10);
});

test("Subtraction of vectors", () => {
	const value = new Vector2D(5, 5);
	const other = new Vector2D(10, 5);
	const result = value.subtract(other);

	expect(result.x).toBe(-5);
	expect(result.y).toBe(0);
});

test("Multiplication of vector with scalar", () => {
	const value = new Vector2D(5, 2);
	const result = value.multiply(5);

	expect(result.x).toBe(25);
	expect(result.y).toBe(10);
});

test("Division of vector with scalar", () => {
	const value = new Vector2D(25, 10);
	const result = value.divide(5);

	expect(result.x).toBe(5);
	expect(result.y).toBe(2);
});

test("Dot product of vectors", () => {
	const value = new Vector2D(1, 0);
	const other = new Vector2D(0, 1);
	const result = value.dot(other);

	expect(result).toBe(0);
});

test("Perp dot product of vectors", () => {
	const value = new Vector2D(2, 3);
	const other = new Vector2D(4, 5);
	const result = value.perpDot(other);

	expect(result).toBe(-2);
});

test("Cross product of vectors is the scalar z component", () => {
	const value = new Vector2D(3, -3);
	const other = new Vector2D(4, 9);
	const result = value.cross(other);

	expect(result).toBe(39);
	expect(result).toBe(value.perpDot(other));
});

test("Check magnitude of vector", () => {
	const value = new Vector2D(2, 3);

	let result = value.magnitude();
	expect(result).approximately(3.605551275463989, 0.0000000000000005);

	result = value.magnitudeSquared();
	expect(result).toBe(13);
});

test("Normalize vector", () => {
	const value = new Vector2D(5, 0);
	const result = value.normalize();

	expect(result.x).toBe(1);
	expect(result.y).toBe(0);
});

test("Normalize zero vector stays zero", () => {
	const result = new Vector2D(0, 0).normalize();

	expect(result.x).toBe(0);
	expect(result.y).toBe(0);
});

test("Distance between vectors", () => {
	const value = new Vector2D(5, 0);
	const other = new Vector2D(10, 0);
	const result = value.distanceBetween(other);

	expect(result).toBe(5);
});

test("Angle between vectors", () => {
	const value = new Vector2D(1, 0);
	const other = new Vector2D(0, 1);
	const result = value.angleBetween(other);

	expect(result).toBe(90);
});

test("Check heading of vector", () => {
	const value = new Vector2D(0, 1);
	const result = value.heading();

	expect(result).toBe(90);
});

test("Interpolate between two vectors", () => {
	const value = new Vector2D(0, 0);
	const other = new Vector2D(4, 0);

	let result = value.interpolate(other, 0.5);
	expect(result.x).toBe(2);
	expect(result.y).toBe(0);

	result = value.interpolate(other, 2);
	expect(result.x).toBe(4);
	expect(result.y).toBe(0);

	result = value.interpolate(other, -1);
	expect(result.x).toBe(0);
	expect(result.y).toBe(0);
});

test("Check parallel vectors", () => {
	const value = new Vector2D(1, -3);
	const collinearValue = new Vector2D(3, -9);
	const notCollinearValue = new Vector2D(3, 10);

	let result = value.isCollinear(collinearValue);
	expect(result).toBeTruthy();

	result = value.isCollinear(notCollinearValue);
	expect(result).toBeFalsy();
});

test("Check orthogonal vectors", () => {
	const value = new Vector2D(1, 0);
	const orthogonalValue = new Vector2D(0, 1);
	const notOrthogonalValue = new Vector2D(1, 2);

	let result = value.isOrthogonal(orthogonalValue);
	expect(result).toBeTruthy();

	result = value.isOrthogonal(notOrthogonalValue);
	expect(result).toBeFalsy();
});

test("Compare two vectors", () => {
	const value = new Vector2D(2, 3);
	const equalValue = new Vector2D(2, 3);
	const notEqualValue = new Vector2D(5, 3);

	let result = value.equals(equalValue);
	expect(result).toBeTruthy();

	result = value.equals(notEqualValue);
	expect(result).toBeFalsy();
});

test("Return vector as array", () => {
	const vector = new Vector2D(2, 3);
	const values = vector.asArray();

	expect(values).toEqual([2, 3]);
});
