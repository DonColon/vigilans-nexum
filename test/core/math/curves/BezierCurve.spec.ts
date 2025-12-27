import { describe, test, expect } from "vitest";
import { BezierCurve } from "@/core/math/curves/BezierCurve";
import { Vector } from "@/core/math/geometry/Vector";

describe("BezierCurve Test Suite", () => {
	test("Creates linear Bezier curve", () => {
		const start = new Vector(0, 0);
		const end = new Vector(10, 10);
		const curve = BezierCurve.linear(start, end);
		
		expect(curve).toBeDefined();
	});

	test("Creates quadratic Bezier curve", () => {
		const curve = BezierCurve.quadratic(
			new Vector(0, 0),
			new Vector(5, 10),
			new Vector(10, 0)
		);
		
		expect(curve).toBeDefined();
	});

	test("Creates cubic Bezier curve", () => {
		const curve = BezierCurve.cubic(
			new Vector(0, 0),
			new Vector(3, 10),
			new Vector(7, 10),
			new Vector(10, 0)
		);
		
		expect(curve).toBeDefined();
	});

	test("Gets point at t=0 (start)", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 10));
		const point = curve.getPoint(0);
		
		expect(point.x).toBeCloseTo(0, 10);
		expect(point.y).toBeCloseTo(0, 10);
	});

	test("Gets point at t=1 (end)", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 10));
		const point = curve.getPoint(1);
		
		expect(point.x).toBeCloseTo(10, 10);
		expect(point.y).toBeCloseTo(10, 10);
	});

	test("Gets point at t=0.5 (middle)", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 10));
		const point = curve.getPoint(0.5);
		
		expect(point.x).toBeCloseTo(5, 10);
		expect(point.y).toBeCloseTo(5, 10);
	});

	test("Calculates curve length", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(3, 4));
		const length = curve.getLength();
		
		// Linear curve length should be close to Euclidean distance
		expect(length).toBeCloseTo(5, 1); // sqrt(3²+4²) = 5
	});

	test("Gets tangent vector along curve", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 0));
		const tangent = curve.getTangent(0.5);
		
		// Tangent should be normalized and horizontal
		expect(Math.abs(tangent.x)).toBeGreaterThan(0.9); // Normalized, pointing horizontally
		expect(Math.abs(tangent.y)).toBeLessThan(0.1); // Mostly horizontal
	});

	test("Gets normal vector along curve", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 0));
		const normal = curve.getNormal(0.5);
		
		// Normal should be perpendicular to tangent
		expect(Math.abs(normal.y)).toBeGreaterThan(0.9); // Pointing up or down
	});

	test("Splits curve at t=0.5", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 10));
		const { left, right } = curve.split(0.5);
		
		const leftEnd = left.getPoint(1);
		const rightStart = right.getPoint(0);
		
		// Split point should be the same for both curves
		expect(leftEnd.x).toBeCloseTo(rightStart.x, 10);
		expect(leftEnd.y).toBeCloseTo(rightStart.y, 10);
	});

	test("Gets bounding box", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 10));
		const bounds = curve.getBounds();
		
		expect(bounds.getPosition().x).toBeLessThanOrEqual(0);
		expect(bounds.getPosition().y).toBeLessThanOrEqual(0);
		expect(bounds.getWidth()).toBeGreaterThanOrEqual(10);
		expect(bounds.getHeight()).toBeGreaterThanOrEqual(10);
	});

	test("Throws error for too few control points", () => {
		expect(() => new BezierCurve([new Vector(0, 0)])).toThrow();
	});

	test("Throws error for too many control points", () => {
		const points = [
			new Vector(0, 0),
			new Vector(1, 1),
			new Vector(2, 2),
			new Vector(3, 3),
			new Vector(4, 4)
		];
		expect(() => new BezierCurve(points)).toThrow();
	});
});
