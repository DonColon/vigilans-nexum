import { test, expect, suite } from "vitest";

import { LineStyle } from "../../../src/core/graphics/styles/line/LineStyle";
import { LineCap } from "../../../src/core/graphics/styles/line/LineCap";
import { LineJoin } from "../../../src/core/graphics/styles/line/LineJoin";

suite("LineStyle Class Unit Tests", () => {
	test("should create a line style object", () => {
		const lineStyle = new LineStyle();
		expect(lineStyle).toBeDefined();

		expect(lineStyle.getWidth()).toBe(1);
		expect(lineStyle.getDashPattern()).toHaveLength(0)
		expect(lineStyle.getDashOffset()).toBe(0);
		expect(lineStyle.getCap()).toBe(LineCap.BUTT);
		expect(lineStyle.getJoin()).toBe(LineJoin.MITER);
	});
});
