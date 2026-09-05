import { test, expect, suite } from "vitest";

import { TextStyle } from "../../../src/core/graphics/styles/text/TextStyle";
import { TextAlign } from "../../../src/core/graphics/styles/text/TextAlign";
import { TextBaseline } from "../../../src/core/graphics/styles/text/TextBaseline";
import { TextDirection } from "../../../src/core/graphics/styles/text/TextDirection";

suite("TextStyle Class Unit Tests", () => {
	test("should create a font style object", () => {
		const textStyle = new TextStyle();
		expect(textStyle).toBeDefined();

		expect(textStyle.getAlign()).toBe(TextAlign.START);
		expect(textStyle.getBaseline()).toBe(TextBaseline.ALPHABETIC);
		expect(textStyle.getDirection()).toBe(TextDirection.LTR);
	});
});
