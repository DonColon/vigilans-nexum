import { test, expect, suite } from "vitest";

import { hex2hsl, hex2hwb, hex2rgb, hsl2hex, hsl2rgb, hwb2hex, hwb2hsl, hwb2rgb, rgb2hsl, rgb2hwb } from "../../../src/core/graphics/color/ColorSpaces";

suite("Color Test Suite", () => {
	test("HEX to RGB", () => {
		const rgb = hex2rgb("#FC0C");
		expect(rgb.red).toBe(255);
		expect(rgb.green).toBe(204);
		expect(rgb.blue).toBe(0);
		expect(rgb.alpha).toBe(80);

		expect(() => hex2rgb("#ff")).toThrowError(SyntaxError);
	});

	test("HEX to HSL", () => {
		const hsl = hex2hsl("#FC0C");
		expect(hsl.hue).toBe(48);
		expect(hsl.saturation).toBe(100);
		expect(hsl.lightness).toBe(50);
		expect(hsl.alpha).toBe(80);
	});

	test("HEX to HWB", () => {
		const hwb = hex2hwb("#FC0C");
		expect(hwb.hue).toBe(48);
		expect(hwb.whiteness).toBe(0);
		expect(hwb.blackness).toBe(0);
		expect(hwb.alpha).toBe(80);
	});

	test("HWB to HSL", () => {
		const hsl = hwb2hsl(208, 14, 42, 80);
		expect(hsl.hue).toBe(208);
		expect(hsl.saturation).toBe(61);
		expect(hsl.lightness).toBe(36);
		expect(hsl.alpha).toBe(80);
	});

	test("RGB to HWB", () => {
		const hwb = rgb2hwb(36, 97, 149, 80);
		expect(hwb.hue).toBe(208);
		expect(hwb.whiteness).toBe(14);
		expect(hwb.blackness).toBe(42);
		expect(hwb.alpha).toBe(80);
	});

	test("RGB to HSL", () => {
		const hsl = rgb2hsl(50, 150, 125, 80);
		expect(hsl.hue).toBe(165);
		expect(hsl.saturation).toBe(50);
		expect(hsl.lightness).toBe(39);
		expect(hsl.alpha).toBe(80);
	});

	test("HSL to RGB", () => {
		let rgb = hsl2rgb(60, 100, 50, 80);
		expect(rgb.red).toBe(255);
		expect(rgb.green).toBe(255);
		expect(rgb.blue).toBe(0);
		expect(rgb.alpha).toBe(80);

		rgb = hsl2rgb(240, 100, 25, 80);
		expect(rgb.red).toBe(0);
		expect(rgb.green).toBe(0);
		expect(rgb.blue).toBe(128);
		expect(rgb.alpha).toBe(80);

		rgb = hsl2rgb(300, 100, 25, 80);
		expect(rgb.red).toBe(128);
		expect(rgb.green).toBe(0);
		expect(rgb.blue).toBe(128);
		expect(rgb.alpha).toBe(80);
	});

	test("HSL to HEX", () => {
		const hex = hsl2hex(168, 58, 37, 80);
		expect(hex).toBe("#28957fcc");
	});

	test("HWB to HEX", () => {
		const hex = hwb2hex(168, 16, 42, 80);
		expect(hex).toBe("#2a937ecc");
	});

	test("HWB to RGB", () => {
		const rgb = hwb2rgb(168, 16, 42, 80);
		expect(rgb.red).toBe(42);
		expect(rgb.green).toBe(147);
		expect(rgb.blue).toBe(126);
		expect(rgb.alpha).toBe(80);
	});
});
