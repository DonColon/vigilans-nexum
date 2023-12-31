import { test, expect } from "vitest";
import { Vector } from "../../../src/core/math/Vector";

test("Create vector from array", () => {
	const values = [2, 3, 4];
	const result = Vector.ofArray(values);

	expect(result.x).toBe(2);
	expect(result.y).toBe(3);
	expect(result.z).toBe(4);
});

test("Create vector from angle", () => {
	const result = Vector.ofAngle(45);

	expect(result.x).approximately(0.7071067811865476, 0.0000000000000005);
	expect(result.y).approximately(0.7071067811865475, 0.0000000000000005);
	expect(result.z).toBe(0);
});

test("Addition of vectors", () => {
	const value = new Vector(3, 5);
	const other = new Vector(2, 5);
	const result = value.add(other);

	expect(result.x).toBe(5);
	expect(result.y).toBe(10);
	expect(result.z).toBe(0);
});

test("Subtraction of vectors", () => {
	const value = new Vector(5, 5);
	const other = new Vector(10, 5);
	const result = value.subtract(other);

	expect(result.x).toBe(5);
	expect(result.y).toBe(0);
	expect(result.z).toBe(0);
});

test("Multiplication of vector with scalar", () => {
	const value = new Vector(5, 2);
	const result = value.multiply(5);

	expect(result.x).toBe(25);
	expect(result.y).toBe(10);
	expect(result.z).toBe(0);
});

test("Division of vector with scalar", () => {
	const value = new Vector(25, 10);
	const result = value.divide(5);

	expect(result.x).toBe(5);
	expect(result.y).toBe(2);
	expect(result.z).toBe(0);
});

test("Dot product of vectors", () => {
	const value = new Vector(1, 0);
	const other = new Vector(0, 1);
	const result = value.dot(other);

	expect(result).toBe(0);
});

test("Perp dot product of vectors", () => {
	const value = new Vector(2, 3);
	const other = new Vector(4, 5);
	const result = value.perpDot(other);

	expect(result).toBe(-2);
});

test("Cross product of vectors", () => {
	const value = new Vector(3, -3, 1);
	const other = new Vector(4, 9, 2);
	const result = value.cross(other);

	expect(result.x).toBe(-15);
	expect(result.y).toBe(-2);
	expect(result.z).toBe(39);
});

test("Check magnitude of vector", () => {
	const value = new Vector(2, 3);

	let result = value.magnitude();
	expect(result).approximately(3.605551275463989, 0.0000000000000005);

	result = value.magnitudeSquared();
	expect(result).toBe(13);
});

test("Normalize vector", () => {
	const value = new Vector(5, 0);
	const result = value.normalize();

	expect(result.x).toBe(1);
	expect(result.y).toBe(0);
	expect(result.z).toBe(0);
});

test("Distance between vectors", () => {
	const value = new Vector(5, 0);
	const other = new Vector(10, 0);
	const result = value.distanceBetween(other);

	expect(result).toBe(5);
});

test("Distance between vectors", () => {
	const value = new Vector(5, 0);
	const other = new Vector(10, 0);
	const result = value.distanceBetween(other);

	expect(result).toBe(5);
});

test("Angle between vectors", () => {
	const value = new Vector(1, 0);
	const other = new Vector(0, 1);
	const result = value.angleBetween(other);

	expect(result).toBe(90);
});

test("Check heading of vector", () => {
	const value = new Vector(0, 1);
	const result = value.heading();

	expect(result).toBe(90);
});

test("Interpolate betweem two vectors", () => {
	const value = new Vector(0, 0);
	const other = new Vector(4, 0);

	let result = value.interpolate(other, 0.5);
	expect(result.x).toBe(2);
	expect(result.y).toBe(0);
	expect(result.z).toBe(0);

	result = value.interpolate(other, 2);
	expect(result.x).toBe(4);
	expect(result.y).toBe(0);
	expect(result.z).toBe(0);
});

test("Check parallel vectors", () => {
	const value = new Vector(1, -3);
	const collinearValue = new Vector(3, -9);
	const notCollinearValue = new Vector(3, 10);

	let result = value.isCollinear(collinearValue);
	expect(result).toBeTruthy();

	result = value.isCollinear(notCollinearValue);
	expect(result).toBeFalsy();
});

test("Check vertical vectors", () => {
	const value = new Vector(1, 0);
	const verticalValue = new Vector(0, 1);
	const notVerticalValue = new Vector(1, 2);

	let result = value.isVertical(verticalValue);
	expect(result).toBeTruthy();

	result = value.isVertical(notVerticalValue);
	expect(result).toBeFalsy();
});

test("Compare two vectors", () => {
	const value = new Vector(2, 3, 4);
	const equalValue = new Vector(2, 3, 4);
	const notEqualValue = new Vector(5, 3, 10);

	let result = value.equals(equalValue);
	expect(result).toBeTruthy();

	result = value.equals(notEqualValue);
	expect(result).toBeFalsy();
});

test("Return vector as array", () => {
	const vector = new Vector(2, 3, 4);
	const values = vector.asArray();

	expect(values).toEqual([2, 3, 4]);
});
