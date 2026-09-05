import { test, expect, suite } from "vitest";
import { FontStyle } from "../../../src/core/graphics/styles/text/FontStyle";

suite("FontStyle Class Unit Tests", () => {
	test("should create a font style object", () => {
		const fontStyle = new FontStyle();
		expect(fontStyle).toBeDefined();

		expect(fontStyle.getStyle()).toBe("normal");
		expect(fontStyle.getVariant()).toBe("normal");
		expect(fontStyle.getWeight()).toBe("normal");
		expect(fontStyle.getSize()).toBe("10px");
		expect(fontStyle.getLineHeight()).toBe("normal");
		expect(fontStyle.getFamily()).toBe("sans-serif");
	});

	test("should retrieve font style as css property", () => {
		const fontStyle = new FontStyle({
			style: "italic",
			variant: "small-caps",
			weight: "700",
			size: "24px",
			lineHeight: "3",
			family: "arial"
		});

		expect(fontStyle.asCss()).toBe("italic small-caps 700 24px/3 arial");
	});
});
