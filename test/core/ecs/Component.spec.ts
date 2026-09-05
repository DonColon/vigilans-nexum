import { test, expect, suite } from "vitest";
import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

suite("Component Test Suite", () => {
	interface Point extends JsonSchema {
		x: number;
		y: number;
	}

	test("Parse a component from json", () => {
		const json = '{"x": 10, "y": 20}';
		const component = Component.parse<Point>(json);
		expect(component.toObject()).toEqual({ x: 10, y: 20 });
	});

	test("Clone a component", () => {
		const component = new Component<Point>({ x: 10, y: 20 });
		const clone = component.clone();
		expect(clone.toObject()).toEqual({ x: 10, y: 20 });
	});

	test("Copy a component", () => {
		const component = new Component<Point>({ x: 10, y: 20 });
		const other = new Component<Point>({ x: 50, y: 50 });
		component.copy(other);
		expect(component.toObject()).toEqual({ x: 50, y: 50 });
	});

	test("Update a component", () => {
		const component = new Component<Point>({ x: 10, y: 20 });
		component.update({ x: 50, y: 50 });
		expect(component.toObject()).toEqual({ x: 50, y: 50 });
	});

	test("Convert a component to string", () => {
		const component = new Component<Point>({ x: 10, y: 20 });
		expect(component.toString()).toEqual('{\n\t"x": 10,\n\t"y": 20\n}');
	});

	test("Clone does not share data with the original", () => {
		const component = new Component<Point>({ x: 10, y: 20 });
		const clone = component.clone();

		component.update({ x: 99, y: 99 });

		expect(clone.toObject()).toEqual({ x: 10, y: 20 });
	});

	test("Clone preserves the concrete component subclass", () => {
		class PointComponent extends Component<Point> {
			public static readonly type = "point";
		}

		const component = new PointComponent({ x: 10, y: 20 });
		const clone = component.clone();

		expect(clone).toBeInstanceOf(PointComponent);
		expect(clone).not.toBe(component);
	});

	test("Copy detaches nested data from the source", () => {
		interface Nested extends JsonSchema {
			position: JsonSchema;
		}

		const component = new Component<Nested>({ position: { x: 0, y: 0 } });
		const other = new Component<Nested>({ position: { x: 5, y: 5 } });

		component.copy(other);
		other.update({ position: { x: 99, y: 99 } });

		expect(component.toObject()).toEqual({ position: { x: 5, y: 5 } });
	});

	test("Read returns the live data without copying", () => {
		const component = new Component<Point>({ x: 10, y: 20 });

		expect(component.read()).toBe(component.read());
		expect(component.read()).not.toBe(component.toObject());
		expect(component.read()).toEqual({ x: 10, y: 20 });
	});
});
