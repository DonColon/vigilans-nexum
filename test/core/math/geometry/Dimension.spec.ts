import { test, expect, suite } from "vitest";
import type { Dimension } from "@/core/math/geometry/Dimension";

suite("Dimension Test Suite", () => {
	test("Creates dimension with width and height", () => {
		const dim: Dimension = { width: 100, height: 200 };
		expect(dim.width).toBe(100);
		expect(dim.height).toBe(200);
	});

	test("Dimension is a simple interface", () => {
		const dim: Dimension = { width: 50, height: 75 };
		expect(typeof dim.width).toBe("number");
		expect(typeof dim.height).toBe("number");
	});
});
