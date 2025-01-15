import { test, expect } from "vitest";
import { Line } from "../../../src/core/math/Line";
import { Vector } from "../../../src/core/math/Vector";
import { Circle } from "../../../src/core/math/Circle";
import { Rectangle } from "../../../src/core/math/Rectangle";
import { Polygon } from "../../../src/core/math/Polygon";

test("Create line from two points", () => {
	const start = new Vector(0, 0);
    const end = new Vector(6, 0);

    const result = Line.ofPoints(start, end);

    const lineStart = result.getStart();
    expect(lineStart.x).toBe(0);
	expect(lineStart.y).toBe(0);
	expect(lineStart.z).toBe(0);

    const lineEnd = result.getEnd();
    expect(lineEnd.x).toBe(6);
	expect(lineEnd.y).toBe(0);
	expect(lineEnd.z).toBe(0);
});

test("Line contains point", () => {
	const value = new Line(0, 0, 6, 0);
    const positiveValue = new Vector(3, 0);
    const negativeValue = new Vector(9, 0);

    let result = value.contains(positiveValue);
    expect(result).toBeTruthy();

    result = value.contains(negativeValue);
    expect(result).toBeFalsy();
});

test("Line intersects with line", () => {
	const value = new Line(0, 0, 6, 0);
    const positiveValue = new Line(3, 3, 3, -3);
    const negativeValue = new Line(0, 3, 3, 3);

    let result = value.intersects(positiveValue);
    expect(result).toBeTruthy();

    result = value.intersects(negativeValue);
    expect(result).toBeFalsy();
});

test("Line intersects with circle", () => {
	const value = new Line(0, 0, 6, 0);
    const positiveValue = new Circle(0, 3, 3);
    const negativeValue = new Circle(5, 5, 2);

    let result = value.intersects(positiveValue);
    expect(result).toBeTruthy();

    result = value.intersects(negativeValue);
    expect(result).toBeFalsy();
});

test("Line intersects with rectangle", () => {
	const value = new Line(0, 0, 6, 0);
    const positiveValue = new Rectangle(1, -2, 3, 4);
    const negativeValue = new Rectangle(100, 100, 1, 1);

    let result = value.intersects(positiveValue);
    expect(result).toBeTruthy();

    result = value.intersects(negativeValue);
    expect(result).toBeFalsy();
});

test("Line intersects with polygon", () => {
	const value = new Line(0, 0, 6, 0);

    const positiveValue = new Polygon([
        new Vector(1, -2),
        new Vector(1, 2),
        new Vector(0, 8)
    ]);

    const negativeValue = new Polygon([
        new Vector(5, 5),
        new Vector(10, 10),
        new Vector(5, 15)
    ]);
    
    let result = value.intersects(positiveValue);
    expect(result).toBeTruthy();

    result = value.intersects(negativeValue);
    expect(result).toBeFalsy();
});

test("Line intersects with null", () => {
	const value = new Line(0, 0, 6, 0);
    const errorValue = null;
    
    const result = value.intersects(errorValue);
    expect(result).toBeFalsy();
});

test("Reflect vector with line", () => {
	const value = new Line(0, 0, 0, 6);
    const other = new Vector(-6, 3);
    
    let result = value.reflect(other);
    expect(result.x).toBe(6);
    expect(result.y).toBe(3);
    expect(result.z).toBe(0);
});

test("Get vertical bisector of line", () => {
	const value = new Line(0, 0, 0, 6);
    const result = value.getVerticalBisector();

    expect(result.A).toBe(-0);
    expect(result.B).toBe(6);
    expect(result.C).toBe(18);
});

test("Two lines are parallel", () => {
	const value = new Line(0, 0, 6, 0);
    const positiveValue = new Line(0, 6, 6, 6);
    const negativeValue = new Line(3, -3, 3, 3);
    
    let result = value.isParallel(positiveValue);
    expect(result).toBeTruthy();

    result = value.isParallel(negativeValue);
    expect(result).toBeFalsy();
});

test("Get angle of line", () => {
	const value = new Line(0, 0, 1, 1);
    const result = value.getAngle();
    expect(result).toBe(45)
});

test("Get slope of line", () => {
	const value = new Line(0, 0, 1, 1);
    const result = value.getSlope();
    expect(result).toBe(1);
});

test("Get center of line", () => {
	const value = new Line(0, 0, 6, 0);
    const result = value.getCenter();

    expect(result.x).toBe(3);
    expect(result.y).toBe(0);
    expect(result.z).toBe(0);
});
