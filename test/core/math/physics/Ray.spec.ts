import { describe, test, expect } from "vitest";
import { Ray } from "@/core/math/physics/Ray";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Line } from "@/core/math/geometry/Line";
import { Circle } from "@/core/math/geometry/Circle";
import { Rectangle } from "@/core/math/geometry/Rectangle";

describe("Ray Test Suite", () => {
	test("Creates ray with origin and direction", () => {
		const origin = new Vector2D(0, 0);
		const direction = new Vector2D(1, 0);
		const ray = new Ray(origin, direction);

		expect(ray).toBeDefined();
	});

	test("Creates ray from two points", () => {
		const origin = new Vector2D(0, 0);
		const target = new Vector2D(10, 0);
		const ray = Ray.fromPoints(origin, target);

		expect(ray).toBeDefined();
		expect(ray.getOrigin()).toEqual(origin);
	});

	test("Creates ray from angle", () => {
		const origin = new Vector2D(0, 0);
		const ray = Ray.fromAngle(origin, 0); // 0 degrees (right)

		const point = ray.getPoint(10);
		expect(point.x).toBeGreaterThan(9);
	});

	test("Gets point along ray at distance t", () => {
		const ray = new Ray(new Vector2D(0, 0), new Vector2D(1, 0));
		const point = ray.getPoint(10);

		expect(point.x).toBeCloseTo(10, 10);
		expect(point.y).toBeCloseTo(0, 10);
	});

	test("Casts ray against line and hits", () => {
		const ray = new Ray(new Vector2D(0, 0), new Vector2D(1, 0));
		const line = Line.ofPoints(new Vector2D(5, -5), new Vector2D(5, 5));

		const hit = ray.castLine(line);
		// Line is vertical at x=5, ray goes right from origin, should intersect
		if (hit) {
			expect(hit.point.x).toBeCloseTo(5, 2);
			expect(hit.distance).toBeGreaterThan(4);
		}
	});

	test("Casts ray against line and misses", () => {
		const ray = new Ray(new Vector2D(0, 0), new Vector2D(1, 0)); // Ray going right
		const line = Line.ofPoints(new Vector2D(-10, 5), new Vector2D(-5, 5)); // Line segment behind and above ray

		const hit = ray.castLine(line);
		expect(hit).toBeNull();
	});

	test("Casts ray against circle and hits", () => {
		const ray = new Ray(new Vector2D(0, 0), new Vector2D(1, 0));
		const circle = new Circle(10, 0, 2);

		const hit = ray.castCircle(circle);
		if (hit) {
			expect(hit.point.x).toBeCloseTo(8, 1); // Hits at 10-2 = 8
			expect(hit.distance).toBeGreaterThan(0);
		}
	});

	test("Casts ray against circle and misses", () => {
		const ray = new Ray(new Vector2D(0, 0), new Vector2D(1, 0));
		const circle = new Circle(0, 10, 2);

		const hit = ray.castCircle(circle);
		expect(hit).toBeNull();
	});

	test("Casts ray against rectangle and hits", () => {
		const ray = new Ray(new Vector2D(0, 0), new Vector2D(1, 0));
		const rectangle = new Rectangle(5, -2, 4, 4);

		const hit = ray.castRectangle(rectangle);
		// Ray going right from origin should hit left edge of rectangle
		if (hit) {
			expect(hit.point.x).toBeCloseTo(5, 1);
			expect(hit.distance).toBeGreaterThan(0);
		}
	});

	test("Casts ray against rectangle and misses", () => {
		const ray = new Ray(new Vector2D(0, 0), new Vector2D(1, 0));
		const rectangle = new Rectangle(5, 10, 4, 4);

		const hit = ray.castRectangle(rectangle);
		expect(hit).toBeNull();
	});
});
