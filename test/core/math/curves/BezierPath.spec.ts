import { describe, test, expect } from "vitest";
import { BezierPath } from "@/core/math/curves/BezierPath";
import { BezierCurve } from "@/core/math/curves/BezierCurve";
import { Vector } from "@/core/math/geometry/Vector";

describe("BezierPath Test Suite", () => {
	test("Creates empty path", () => {
		const path = new BezierPath([]);
		expect(path.getCurves().length).toBe(0);
	});

	test("Creates path with single curve", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 10));
		const path = new BezierPath([curve]);
		
		expect(path.getCurves().length).toBe(1);
	});

	test("Creates path with multiple curves", () => {
		const curve1 = BezierCurve.linear(new Vector(0, 0), new Vector(10, 10));
		const curve2 = BezierCurve.linear(new Vector(10, 10), new Vector(20, 0));
		const path = new BezierPath([curve1, curve2]);
		
		expect(path.getCurves().length).toBe(2);
	});

	test("Gets total path length", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 0));
		const path = new BezierPath([curve]);
		
		const length = path.getLength();
		expect(length).toBeGreaterThan(9);
	});

	test("Gets point at path parameter t", () => {
		const curve = BezierCurve.linear(new Vector(0, 0), new Vector(10, 0));
		const path = new BezierPath([curve]);
		
		const point = path.getPoint(0.5);
		expect(point!.x).toBeCloseTo(5, 1);
	});
});
