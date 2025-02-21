import { test, expect } from "vitest";
import { Vector } from "../../../src/core/math/Vector";
import { Polygon } from "../../../src/core/math/Polygon";

test("Create convex hull from points", () => {
	const negativeValue = new Vector(2, 3);

	const points = [new Vector(5, 5), new Vector(0, 0), new Vector(5, 0), new Vector(0, 5), negativeValue];

	const value = Polygon.buildConvexHull(points);
	const vertices = value.getVertices();

	expect(vertices).toHaveLength(4);
	expect(vertices).to.not.contain(negativeValue);
});

test("Polygon intersects with null", () => {
	const value = new Polygon([new Vector(5, 0), new Vector(10, 5), new Vector(0, 5)]);
	const result = value.intersects(null);
	expect(result).toBeFalsy();
});

test("Polygon contains point", () => {
	const value = new Polygon([new Vector(5, 0), new Vector(10, 5), new Vector(0, 5)]);

	const positiveValue = new Vector(5, 3);
	const negativeValue = new Vector(100, 100);

	let result = value.contains(positiveValue);
	expect(result).toBeTruthy();

	result = value.contains(negativeValue);
	expect(result).toBeFalsy();
});

test("Get area of polygon", () => {
	const value = new Polygon([new Vector(5, 0), new Vector(10, 5), new Vector(0, 5)]);

	const result = value.getArea();
	expect(result).toBe(25);
});

test("Get perimeter of polygon", () => {
	const value = new Polygon([new Vector(5, 0), new Vector(10, 5), new Vector(0, 5)]);

	const result = value.getPerimeter();
	expect(result).approximately(24.1421, 0.1);
});

test("Get vertex of polygon", () => {
	const value = new Polygon([new Vector(5, 0), new Vector(10, 5), new Vector(0, 5)]);

	let result = value.getVertex(1);
	expect(result.x).toBe(10);
	expect(result.y).toBe(5);
	expect(result.z).toBe(0);

	result = value.getVertex(5);
	expect(result.x).toBe(NaN);
	expect(result.y).toBe(NaN);
	expect(result.z).toBe(0);
});

test("Get vertices of polygon", () => {
	const vertices = [new Vector(5, 0), new Vector(10, 5), new Vector(0, 5)];

	const value = new Polygon(vertices);
	const result = value.getVertices();

	expect(result).toHaveLength(3);

	for (let i = 0; i < vertices.length; i++) {
		const vertex = vertices[i];
		const vector = result[i];

		expect(vector.x).toBe(vertex.x);
		expect(vector.y).toBe(vertex.y);
		expect(vector.z).toBe(vertex.z);
	}
});

test("Add vertex to polygon", () => {
	const value = new Polygon([new Vector(5, 0), new Vector(5, 5), new Vector(0, 5)]);

	const other = value.addVertex(new Vector(0, 0));
	const result = other.getVertex(3);

	expect(result.x).toBe(0);
	expect(result.y).toBe(0);
	expect(result.z).toBe(0);
});

test("Remove vertex from polygon", () => {
	const value = new Polygon([new Vector(5, 0), new Vector(5, 5), new Vector(0, 5), new Vector(0, 0)]);

	value.removeVertex(3);

	const vertex = value.getVertex(3);
	expect(vertex.x).toBe(NaN);
	expect(vertex.y).toBe(NaN);
	expect(vertex.z).toBe(0);

	value.removeVertex(10);

	const vertices = value.getVertices();
	expect(vertices).toHaveLength(3);
});
