import { test, expect, suite } from "vitest";
import { Shadow } from "../../../src/core/graphics/effects/Shadow";
import { Color } from "../../../src/core/graphics/color/Color";

suite("Shadow Class Unit Tests", () => {
	test("should create a shadow object", () => {
		const shadow = new Shadow();
		expect(shadow).toBeDefined();

		const color = shadow.getColor();
		expect(color.asHEX()).toBe("#000");
		expect(shadow.getOffsetX()).toBe(0);
		expect(shadow.getOffsetY()).toBe(0);
		expect(shadow.getBlur()).toBe(0);
	});

	test("should retrieve font style as css property", () => {
		const shadow = new Shadow({
			color: Color.hex("#ff0000"),
			offsetX: 10,
			offsetY: 10,
			blur: 5
		});

		expect(shadow.asDropShadow()).toBe("drop-shadow(10 10 5 #ff0000)");
	});
});
