import { test, expect, suite } from "vitest";
import { GameError } from "@/core/GameError";
import { Spritesheet, TexturePackerHash } from "@/core/graphics/components/Spritesheet";
import { GridSheetLayout } from "@/core/assets/Asset";

function image(width: number, height: number): HTMLImageElement {
	return { width, height } as HTMLImageElement;
}

suite("Spritesheet Test Suite", () => {
	test("Grid layout without gutter is cut row major", () => {
		const layout: GridSheetLayout = { type: "grid", tileWidth: 16, tileHeight: 16, columns: 4, rows: 3 };
		const sheet = Spritesheet.fromGrid(image(64, 48), layout);

		expect(sheet.size()).toBe(12);
		expect(sheet.getRegion(0)).toStrictEqual({ x: 0, y: 0, width: 16, height: 16 });
		// index 6 = row 1, column 2
		expect(sheet.getRegion(6)).toStrictEqual({ x: 32, y: 16, width: 16, height: 16 });
		expect(sheet.getRegion(11)).toStrictEqual({ x: 48, y: 32, width: 16, height: 16 });
	});

	test("Grid layout accounts for margin and spacing", () => {
		const layout: GridSheetLayout = { type: "grid", tileWidth: 16, tileHeight: 16, columns: 3, rows: 2, margin: 2, spacing: 1 };
		const sheet = Spritesheet.fromGrid(image(54, 37), layout);

		expect(sheet.getRegion(0)).toStrictEqual({ x: 2, y: 2, width: 16, height: 16 });
		expect(sheet.getRegion(1)).toStrictEqual({ x: 19, y: 2, width: 16, height: 16 });
		expect(sheet.getRegion(3)).toStrictEqual({ x: 2, y: 19, width: 16, height: 16 });
	});

	test("Grid layout that overflows a sized image is rejected", () => {
		const layout: GridSheetLayout = { type: "grid", tileWidth: 16, tileHeight: 16, columns: 4, rows: 3 };
		expect(() => Spritesheet.fromGrid(image(48, 48), layout)).toThrowError(GameError);
	});

	test("Grid layout is not validated against an image of unknown size", () => {
		const layout: GridSheetLayout = { type: "grid", tileWidth: 16, tileHeight: 16, columns: 4, rows: 3 };
		expect(() => Spritesheet.fromGrid(image(0, 0), layout)).not.toThrow();
	});

	test("Atlas frames keep their order and become addressable by name", () => {
		const atlas: TexturePackerHash = {
			frames: {
				grass: { frame: { x: 0, y: 0, w: 16, h: 16 } },
				water: { frame: { x: 16, y: 0, w: 16, h: 16 } },
				bridge: { frame: { x: 0, y: 16, w: 32, h: 16 } }
			}
		};
		const sheet = Spritesheet.fromAtlas(image(64, 64), atlas);

		expect(sheet.size()).toBe(3);
		expect(sheet.getRegion("water")).toStrictEqual({ x: 16, y: 0, width: 16, height: 16 });
		expect(sheet.getRegion(2)).toStrictEqual({ x: 0, y: 16, width: 32, height: 16 });
		expect(sheet.getName(0)).toBe("grass");
	});

	test("Unknown frames are reported instead of returning undefined", () => {
		const sheet = Spritesheet.fromGrid(image(32, 16), { type: "grid", tileWidth: 16, tileHeight: 16, columns: 2, rows: 1 });

		expect(sheet.has(1)).toBe(true);
		expect(sheet.has(2)).toBe(false);
		expect(sheet.has("nope")).toBe(false);
		expect(() => sheet.getRegion(2)).toThrowError(GameError);
		expect(() => sheet.getRegion("nope")).toThrowError(GameError);
	});

	test("A frame can be handed out as a region bound sprite", () => {
		const sheet = Spritesheet.fromGrid(image(32, 16), { type: "grid", tileWidth: 16, tileHeight: 16, columns: 2, rows: 1 });
		const sprite = sheet.sprite(1);

		expect(sprite.getRegion()).toStrictEqual({ x: 16, y: 0, width: 16, height: 16 });
		expect(sprite.getWidth()).toBe(16);
	});
});
