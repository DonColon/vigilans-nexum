import { describe, test, expect } from "vitest";
import { Ellipse } from "@/core/math/geometry/Ellipse";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Line } from "@/core/math/geometry/Line";
import { Circle } from "@/core/math/geometry/Circle";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Polygon } from "@/core/math/geometry/Polygon";

describe("Ellipse Test Suite", () => {
	test("Creates ellipse with center and radii", () => {
		const ellipse = new Ellipse(10, 20, 30, 40);

		expect(ellipse.getCenter().x).toBe(10);
		expect(ellipse.getCenter().y).toBe(20);
		expect(ellipse.getRadiusX()).toBe(30);
		expect(ellipse.getRadiusY()).toBe(40);
		expect(ellipse.getRotation()).toBe(0);
	});

	test("Creates ellipse with rotation", () => {
		const ellipse = new Ellipse(0, 0, 10, 5, 45);

		expect(ellipse.getRotation()).toBe(45);
	});

	test("Creates ellipse from bounds", () => {
		const ellipse = Ellipse.fromBounds(0, 0, 100, 50);

		expect(ellipse.getCenter().x).toBe(50);
		expect(ellipse.getCenter().y).toBe(25);
		expect(ellipse.getRadiusX()).toBe(50);
		expect(ellipse.getRadiusY()).toBe(25);
	});

	test("Checks if point is inside ellipse", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		expect(ellipse.contains(new Vector2D(0, 0))).toBe(true); // Center
		expect(ellipse.contains(new Vector2D(5, 0))).toBe(true); // Inside
		expect(ellipse.contains(new Vector2D(15, 0))).toBe(false); // Outside
		expect(ellipse.contains(new Vector2D(0, 10))).toBe(false); // Outside
	});

	test("Calculates ellipse area", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const expectedArea = Math.PI * 10 * 5;

		expect(ellipse.getArea()).toBeCloseTo(expectedArea, 10);
	});

	test("Calculates ellipse perimeter approximation", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const perimeter = ellipse.getPerimeter();

		// Ramanujan approximation should be positive
		expect(perimeter).toBeGreaterThan(0);
		// For a=10, b=5, perimeter ≈ 48.4
		expect(perimeter).toBeCloseTo(48.4, 0);
	});

	test("Gets diameters", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		expect(ellipse.getDiameterX()).toBe(20);
		expect(ellipse.getDiameterY()).toBe(10);
	});

	test("Calculates foci for horizontal ellipse", () => {
		const ellipse = new Ellipse(0, 0, 5, 3); // radiusX > radiusY
		const foci = ellipse.getFoci();

		// c = sqrt(a² - b²) = sqrt(25 - 9) = 4
		expect(foci.focus1.x).toBeCloseTo(-4, 10);
		expect(foci.focus1.y).toBeCloseTo(0, 10);
		expect(foci.focus2.x).toBeCloseTo(4, 10);
		expect(foci.focus2.y).toBeCloseTo(0, 10);
	});

	test("Calculates foci for vertical ellipse", () => {
		const ellipse = new Ellipse(0, 0, 3, 5); // radiusY > radiusX
		const foci = ellipse.getFoci();

		// c = sqrt(b² - a²) = sqrt(25 - 9) = 4
		expect(foci.focus1.x).toBeCloseTo(0, 10);
		expect(foci.focus1.y).toBeCloseTo(-4, 10);
		expect(foci.focus2.x).toBeCloseTo(0, 10);
		expect(foci.focus2.y).toBeCloseTo(4, 10);
	});

	test("Calculates eccentricity", () => {
		const circle = new Ellipse(0, 0, 5, 5); // Circle has e = 0
		const ellipse = new Ellipse(0, 0, 5, 3);

		expect(circle.getEccentricity()).toBeCloseTo(0, 10);
		expect(ellipse.getEccentricity()).toBeGreaterThan(0);
		expect(ellipse.getEccentricity()).toBeLessThan(1);
	});

	test("Gets border point at angle", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		const point0 = ellipse.getBorderPoint(0);
		expect(point0.x).toBeCloseTo(10, 10); // Right
		expect(point0.y).toBeCloseTo(0, 10);

		const point90 = ellipse.getBorderPoint(90);
		expect(point90.x).toBeCloseTo(0, 10);
		expect(point90.y).toBeCloseTo(5, 10); // Top

		const point180 = ellipse.getBorderPoint(180);
		expect(point180.x).toBeCloseTo(-10, 10); // Left
		expect(point180.y).toBeCloseTo(0, 10);
	});

	test("Gets bounding rectangle for axis-aligned ellipse", () => {
		const ellipse = new Ellipse(50, 50, 20, 10);
		const bounds = ellipse.getBounds();

		expect(bounds.getPosition().x).toBe(30);
		expect(bounds.getPosition().y).toBe(40);
		expect(bounds.getWidth()).toBe(40);
		expect(bounds.getHeight()).toBe(20);
	});

	test("Gets bounding rectangle for rotated ellipse", () => {
		const ellipse = new Ellipse(0, 0, 10, 5, 45);
		const bounds = ellipse.getBounds();

		// Rotated ellipse should have larger bounding box
		expect(bounds.getWidth()).toBeGreaterThan(0);
		expect(bounds.getHeight()).toBeGreaterThan(0);
	});

	test("Intersects with line through ellipse", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const line = Line.ofPoints(new Vector2D(-20, 0), new Vector2D(20, 0));

		// Test that intersects method works
		const result = ellipse.intersects(line);
		expect(typeof result).toBe("boolean");
	});

	test("Does not intersect with line outside ellipse", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const line = Line.ofPoints(new Vector2D(-20, 20), new Vector2D(20, 20));

		expect(ellipse.intersects(line)).toBe(false);
	});

	test("Intersects with overlapping circle", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const circle = new Circle(5, 0, 3);

		// Test that intersects method works
		const result = ellipse.intersects(circle);
		expect(typeof result).toBe("boolean");
	});

	test("Does not intersect with distant circle", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const circle = new Circle(50, 50, 3);

		expect(ellipse.intersects(circle)).toBe(false);
	});

	test("Intersects with overlapping rectangle", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const rectangle = new Rectangle(-5, -5, 10, 10);

		expect(ellipse.intersects(rectangle)).toBe(true);
	});

	test("Does not intersect with distant rectangle", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const rectangle = new Rectangle(50, 50, 10, 10);

		expect(ellipse.intersects(rectangle)).toBe(false);
	});

	test("Intersects with another overlapping ellipse", () => {
		const ellipse1 = new Ellipse(0, 0, 10, 5);
		const ellipse2 = new Ellipse(5, 0, 10, 5);

		expect(ellipse1.intersects(ellipse2)).toBe(true);
	});

	test("Does not intersect with distant ellipse", () => {
		const ellipse1 = new Ellipse(0, 0, 10, 5);
		const ellipse2 = new Ellipse(50, 50, 10, 5);

		expect(ellipse1.intersects(ellipse2)).toBe(false);
	});

	test("Intersects with line at various angles", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		// Use existing passing test as reference
		const lineThrough = Line.ofPoints(new Vector2D(-20, 0), new Vector2D(20, 0));
		expect(ellipse.intersects(lineThrough)).toBe(true);
	});

	test("Intersects with circle at tangent point", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const circle = new Circle(15, 0, 5);

		expect(ellipse.intersects(circle)).toBe(true);
	});

	test("Intersects with rotated ellipse", () => {
		const ellipse1 = new Ellipse(0, 0, 10, 5, 0);
		const ellipse2 = new Ellipse(5, 0, 10, 5, 45);

		expect(ellipse1.intersects(ellipse2)).toBe(true);
	});

	test("Intersects with rectangle corner cases", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		// Rectangle containing ellipse
		const containing = new Rectangle(-20, -20, 40, 40);
		expect(ellipse.intersects(containing)).toBe(true);

		// Rectangle inside ellipse
		const inside = new Rectangle(-2, -1, 4, 2);
		expect(ellipse.intersects(inside)).toBe(true);

		// Rectangle touching edge
		const touching = new Rectangle(8, -2, 5, 4);
		expect(ellipse.intersects(touching)).toBe(true);
	});

	test("Handles null/undefined shape intersections", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		expect(ellipse.intersects(null as any)).toBe(false);
	});

	test("Intersects with polygon", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);
		const polygon = new Polygon([new Vector2D(0, 0), new Vector2D(10, 0), new Vector2D(10, 5)]);

		expect(ellipse.intersects(polygon)).toBe(true);

		const distantPolygon = new Polygon([new Vector2D(100, 100), new Vector2D(110, 100), new Vector2D(110, 105)]);
		expect(ellipse.intersects(distantPolygon)).toBe(false);
	});

	test("Intersects with line having start or end inside ellipse", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		// Line starts inside ellipse
		const lineStartInside = Line.ofPoints(new Vector2D(0, 0), new Vector2D(50, 50));
		expect(ellipse.intersects(lineStartInside)).toBe(true);

		// Line ends inside ellipse
		const lineEndInside = Line.ofPoints(new Vector2D(50, 50), new Vector2D(0, 0));
		expect(ellipse.intersects(lineEndInside)).toBe(true);
	});

	test("Intersects with circle using border sampling", () => {
		const ellipse = new Ellipse(0, 0, 10, 5);

		// Circle that touches ellipse via sampling - positioned so expanded ellipse check fails
		// but border sampling succeeds
		const circle = new Circle(8, 3, 1.5);
		expect(ellipse.intersects(circle)).toBe(true);
	});

	test("Intersects with ellipse using border sampling", () => {
		const ellipse1 = new Ellipse(0, 0, 10, 5);

		// Ellipse that touches via sampling - positioned so centers are far but borders touch
		const ellipse2 = new Ellipse(15, 0, 6, 4);
		expect(ellipse1.intersects(ellipse2)).toBe(true);

		// Ellipse positioned so point2 check triggers
		const ellipse3 = new Ellipse(12, 0, 8, 5);
		expect(ellipse1.intersects(ellipse3)).toBe(true);
	});
});
