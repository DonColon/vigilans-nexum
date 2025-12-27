import { describe, test, expect } from "vitest";
import { Shape } from "@/core/math/geometry/Shape";
import { Circle } from "@/core/math/geometry/Circle";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector } from "@/core/math/geometry/Vector";

describe("Shape Interface Test Suite", () => {
	test("Circle implements Shape interface", () => {
		const circle = new Circle(0, 0, 10);
		
		// Test that Shape interface methods exist
		expect(typeof circle.contains).toBe("function");
		expect(typeof circle.intersects).toBe("function");
		expect(typeof circle.getBounds).toBe("function");
	});

	test("Rectangle implements Shape interface", () => {
		const rectangle = new Rectangle(0, 0, 10, 10);
		
		// Test that Shape interface methods exist
		expect(typeof rectangle.contains).toBe("function");
		expect(typeof rectangle.intersects).toBe("function");
		expect(typeof rectangle.getBounds).toBe("function");
	});

	test("Shape.contains() works with Vector", () => {
		const circle: Shape = new Circle(0, 0, 10);
		const point = new Vector(5, 5);
		
		const result = circle.contains(point);
		expect(typeof result).toBe("boolean");
	});

	test("Shape.intersects() works with other shapes", () => {
		const circle: Shape = new Circle(0, 0, 10);
		const rectangle: Shape = new Rectangle(0, 0, 10, 10);
		
		const result = circle.intersects(rectangle);
		expect(typeof result).toBe("boolean");
	});

	test("Shape.getBounds() returns Rectangle", () => {
		const circle: Shape = new Circle(0, 0, 10);
		
		const bounds = circle.getBounds();
		expect(bounds).toBeInstanceOf(Rectangle);
	});
});
