import { test, expect, suite } from "vitest";

import { Label } from "../../../src/core/graphics/components/Label";
import { FontStyle } from "../../../src/core/graphics/styles/text/FontStyle";
import { TextStyle } from "../../../src/core/graphics/styles/text/TextStyle";

suite("Label Class Unit Tests", () => {
	test("should create a label object", () => {
		const label = new Label({
			text: "Hello World",
			x: 50,
			y: 50,
			width: 200,
			height: 40,
			fontStyle: new FontStyle(),
			textStyle: new TextStyle()
		});
		expect(label).toBeDefined();
		expect(label.getText()).toBe("Hello World");
		expect(label.getFontStyle()).toEqual(new FontStyle());
		expect(label.getTextStyle()).toEqual(new TextStyle());

		const position = label.getPosition();
		expect(position.x).toBe(50);
		expect(position.y).toBe(50);

		const dimension = label.getDimension();
		expect(dimension.width).toBe(200);
		expect(dimension.height).toBe(40);
	});
});
